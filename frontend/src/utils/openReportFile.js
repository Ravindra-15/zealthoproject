/**
 * Open a private report: PDFs / images open in a new tab, Word files download.
 * The tab is opened synchronously inside the click so it isn't popup-blocked.
 */
export const openReportFile = async (report, fetchBlob) => {
  const viewable =
    report?.mimeType === "application/pdf" || String(report?.mimeType || "").startsWith("image/");
  const win = viewable ? window.open("", "_blank") : null;
  try {
    const blob = await fetchBlob();
    const url = URL.createObjectURL(blob);
    if (viewable && win) {
      win.location.href = url;
    } else {
      if (win) win.close();
      const a = document.createElement("a");
      a.href = url;
      a.download = report?.originalName || "report";
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
  } catch (err) {
    if (win) win.close();
    throw err;
  }
};
