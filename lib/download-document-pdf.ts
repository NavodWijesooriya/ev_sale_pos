export function printDocumentA4(element: HTMLElement) {
  element.classList.add("pdf-export")

  const maxHeightInPixels = (280 * 96) / 25.4
  const scale = Math.min(1, maxHeightInPixels / element.scrollHeight)
  element.style.zoom = String(scale)

  try {
    window.print()
  } finally {
    element.style.removeProperty("zoom")
    element.classList.remove("pdf-export")
  }
}

export async function downloadDocumentPdf(
  element: HTMLElement,
  filename: string,
) {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ])

  const canvas = await html2canvas(element, {
    backgroundColor: "#ffffff",
    logging: false,
    scale: 2,
    useCORS: true,
    onclone: (clonedDocument) => {
      // 1. Remove stylesheets with modern oklch/lab definitions that crash html2canvas's parser
      const styles = Array.from(
        clonedDocument.querySelectorAll("style, link[rel='stylesheet']")
      )
      styles.forEach((style) => {
        style.remove()
      })

      // 2. Clear root and body background/color variables
      if (clonedDocument.documentElement) {
        clonedDocument.documentElement.style.backgroundColor = "#ffffff"
        clonedDocument.documentElement.style.color = "#0f172a"
      }
      if (clonedDocument.body) {
        clonedDocument.body.style.backgroundColor = "#ffffff"
        clonedDocument.body.style.color = "#0f172a"
      }

      // 3. Mark the target pdf document
      clonedDocument
        .querySelector("[data-pdf-document]")
        ?.classList.add("pdf-export")
    },
  })

  if (!canvas.width || !canvas.height) {
    throw new Error("The document could not be rendered for PDF download.")
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  })
  const pageWidth = 210
  const pageHeight = 297
  const margin = 0
  const scale = Math.min(
    pageWidth / canvas.width,
    pageHeight / canvas.height,
  )
  const imageWidth = canvas.width * scale
  const imageHeight = canvas.height * scale

  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.98),
    "JPEG",
    (pageWidth - imageWidth) / 2,
    (pageHeight - imageHeight) / 2,
    imageWidth,
    imageHeight,
  )
  pdf.save(`${filename}.pdf`)
}
