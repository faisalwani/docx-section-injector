
import JSZip from 'jszip';
import { ParagraphMetadata, DocContext } from '../types';

const NS_W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";

export class DocxService {
  private static getText(p: Element): string {
    const textNodes = p.getElementsByTagNameNS(NS_W, "t");
    return Array.from(textNodes)
      .map(t => t.textContent || "")
      .join("")
      .trim();
  }

  private static hasSectPr(p: Element): boolean {
    const pPr = p.getElementsByTagNameNS(NS_W, "pPr")[0];
    return !!(pPr && pPr.getElementsByTagNameNS(NS_W, "sectPr").length > 0);
  }

  private static ensurePPr(xmlDoc: Document, p: Element): Element {
    let pPr = p.getElementsByTagNameNS(NS_W, "pPr")[0];
    if (!pPr) {
      pPr = xmlDoc.createElementNS(NS_W, "w:pPr");
      p.insertBefore(pPr, p.firstChild);
    }
    return pPr;
  }

  public static async parseDocx(file: File): Promise<{ context: DocContext; metadata: ParagraphMetadata[] }> {
    const zip = await JSZip.loadAsync(file);
    const docXml = await zip.file("word/document.xml")?.async("text");

    if (!docXml) throw new Error("Invalid DOCX: missing document.xml");

    const xmlDoc = new DOMParser().parseFromString(docXml, "application/xml");
    const body = xmlDoc.getElementsByTagNameNS(NS_W, "body")[0];
    const paragraphs = body.getElementsByTagNameNS(NS_W, "p");

    const metadata: ParagraphMetadata[] = [];
    for (let i = 0; i < paragraphs.length; i++) {
      metadata.push({
        index: i,
        text: this.getText(paragraphs[i]) || "(Empty paragraph)"
      });
    }

    return {
      context: { zip, xmlDoc, body, paragraphs },
      metadata
    };
  }

  public static async injectContinuousBreak(context: DocContext, index: number): Promise<Blob> {
    const { xmlDoc, body, paragraphs, zip } = context;
    const target = paragraphs[index];
    const next = paragraphs[index + 1] || null;

    // Remove final body-level section
    let finalSectPr: Node | null = null;
    const childNodes = Array.from(body.childNodes);
    for (const node of childNodes) {
      if (node.nodeType === 1 && (node as Element).localName === "sectPr") {
        finalSectPr = node.cloneNode(true);
        body.removeChild(node);
        break;
      }
    }

    // Injection Logic
    if (next && this.hasSectPr(next)) {
      const nextPPr = next.getElementsByTagNameNS(NS_W, "pPr")[0];
      const sectPr = nextPPr.getElementsByTagNameNS(NS_W, "sectPr")[0];
      nextPPr.removeChild(sectPr);

      let type = sectPr.getElementsByTagNameNS(NS_W, "type")[0];
      if (!type) {
        type = xmlDoc.createElementNS(NS_W, "w:type");
        sectPr.appendChild(type);
      }
      type.setAttributeNS(NS_W, "w:val", "continuous");

      this.ensurePPr(xmlDoc, target).appendChild(sectPr);
    } else {
      const sectPr = xmlDoc.createElementNS(NS_W, "w:sectPr");
      const type = xmlDoc.createElementNS(NS_W, "w:type");
      type.setAttributeNS(NS_W, "w:val", "continuous");
      sectPr.appendChild(type);
      this.ensurePPr(xmlDoc, target).appendChild(sectPr);
    }

    // Restore final section
    if (finalSectPr) {
      body.appendChild(finalSectPr);
    }

    const serializedXml = new XMLSerializer().serializeToString(xmlDoc);
    zip.file("word/document.xml", serializedXml);
    return await zip.generateAsync({ type: "blob" });
  }
}
