// POST /functions/v1/contract-generate  { collaborationId: string }
// Auto-generates a contract PDF once a collaboration is accepted (spec §8):
// parties, deliverables, timeline, agreed amount, an explicit usage-rights
// window (never "unlimited forever" by default), and an ASCI-compliant
// sponsored-content disclosure clause.
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";
import { handleOptions, jsonResponse } from "../_shared/cors.ts";
import { getServiceClient, getCallerProfile } from "../_shared/supabaseClient.ts";

Deno.serve(async (req: Request) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    if (req.method !== "POST") return jsonResponse({ error: "Method Not Allowed" }, { status: 405 });
    const body = await req.json();
    if (!body.collaborationId) return jsonResponse({ error: "collaborationId is required" }, { status: 400 });

    const caller = await getCallerProfile(req);
    if (!caller) return jsonResponse({ error: "Not authenticated" }, { status: 401 });

    const supabase = getServiceClient();
    const { data: collab, error } = await supabase
      .from("collaborations")
      .select("*, campaigns(title, brief, category)")
      .eq("id", body.collaborationId)
      .single();
    if (error) throw error;

    if (caller.role !== "admin" && caller.id !== collab.brand_id && caller.id !== collab.creator_id) {
      return jsonResponse({ error: "Not authorized for this collaboration" }, { status: 403 });
    }
    if (collab.status === "invited") {
      return jsonResponse({ error: "Collaboration must be accepted before a contract can be generated." }, { status: 400 });
    }

    const [{ data: brand }, { data: creator }] = await Promise.all([
      supabase.from("brand_profiles").select("company_name").eq("user_id", collab.brand_id).single(),
      supabase.from("profiles").select("full_name, email").eq("id", collab.creator_id).single(),
    ]);

    const usageDays = collab.usage_rights_duration_days ?? 90;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let y = 800;
    const margin = 50;
    const lineHeight = 16;

    const drawTitle = (text: string) => {
      page.drawText(text, { x: margin, y, size: 16, font: boldFont, color: rgb(0.1, 0.1, 0.1) });
      y -= lineHeight * 1.5;
    };
    const drawHeading = (text: string) => {
      y -= 6;
      page.drawText(text, { x: margin, y, size: 12, font: boldFont, color: rgb(0.05, 0.4, 0.35) });
      y -= lineHeight;
    };
    const drawParagraph = (text: string) => {
      const maxWidth = 495;
      const words = text.split(" ");
      let line = "";
      for (const word of words) {
        const testLine = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(testLine, 10) > maxWidth) {
          page.drawText(line, { x: margin, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
          y -= lineHeight;
          line = word;
        } else {
          line = testLine;
        }
      }
      if (line) {
        page.drawText(line, { x: margin, y, size: 10, font, color: rgb(0.15, 0.15, 0.15) });
        y -= lineHeight;
      }
      y -= 4;
    };

    drawTitle("InfluenceOS Collaboration Agreement");
    drawParagraph(`Generated on ${new Date().toLocaleDateString("en-IN")}.`);

    drawHeading("Parties");
    drawParagraph(`Brand: ${brand?.company_name ?? "Unknown brand"}`);
    drawParagraph(`Creator: ${creator?.full_name ?? "Unknown creator"} (${creator?.email ?? "—"})`);

    drawHeading("Deliverables");
    drawParagraph(collab.campaigns?.brief || collab.campaigns?.title || "As agreed in the collaboration workspace messages.");

    drawHeading("Timeline & Amount");
    drawParagraph(`Agreed amount: ${collab.agreed_amount ? `₹${collab.agreed_amount}` : "Barter / non-monetary (as agreed)"}.`);
    drawParagraph("Timeline: content to be delivered as agreed between the parties in the collaboration workspace.");

    drawHeading("Usage Rights");
    drawParagraph(
      `The brand is granted the right to use the delivered content for promotional purposes for a period of ${usageDays} days from the date of delivery. This is an explicit, time-bound license — usage rights are never unlimited or perpetual by default under InfluenceOS's standard terms.`
    );

    drawHeading("Disclosure Clause (ASCI Compliance)");
    drawParagraph(
      "In accordance with the Advertising Standards Council of India (ASCI) guidelines on influencer advertising, the creator agrees to clearly and prominently disclose this content as a paid/sponsored partnership (e.g. using #ad, #sponsored, or the platform's native paid-partnership label) in every deliverable produced under this agreement."
    );

    drawHeading("Data Processing");
    drawParagraph(
      "Both parties acknowledge that InfluenceOS processes their personal data in accordance with India's Digital Personal Data Protection (DPDP) Act, as described in the Trust & Compliance page, and that consent was recorded at signup."
    );

    const pdfBytes = await pdfDoc.save();
    const storagePath = `${collab.id}/contract-${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage.from("contracts").upload(storagePath, pdfBytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (uploadError) throw uploadError;

    const { data: signed, error: signError } = await supabase.storage
      .from("contracts")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 5); // 5 years
    if (signError) throw signError;

    await supabase
      .from("collaborations")
      .update({ contract_pdf_url: signed.signedUrl, disclosure_clause_generated_bool: true })
      .eq("id", collab.id);

    return jsonResponse({ success: true, contractUrl: signed.signedUrl });
  } catch (error) {
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, { status: 500 });
  }
});
