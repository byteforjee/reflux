/**
 * Uploads a document File to IPFS via the server-side /api/ipfs/upload route.
 * Returns the generated IPFS CID string.
 */
export async function uploadInvoiceToIpfs(
  file: File
): Promise<{ cid?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/ipfs/upload", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok || result.error) {
      return { error: result.error || "Failed to upload document to IPFS" };
    }

    return { cid: result.data.cid };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("uploadInvoiceToIpfs error:", message);
    return { error: message };
  }
}
