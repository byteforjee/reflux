import { NextResponse } from "next/server";

/**
 * POST /api/ipfs/upload
 * Server-side route handler to upload invoice documents to Pinata IPFS.
 * Keeps PINATA_JWT secure on the server.
 */
export async function POST(request: Request) {
  try {
    const pinataJwt = process.env.PINATA_JWT;

    if (!pinataJwt) {
      return NextResponse.json(
        { error: "PINATA_JWT is not configured in environment variables" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided in request" }, { status: 400 });
    }

    // Build FormData for Pinata API
    const pinataFormData = new FormData();
    pinataFormData.append("file", file);

    const pinataMetadata = JSON.stringify({
      name: `reflux-invoice-${file.name}`,
      keyvalues: {
        protocol: "reflux",
        timestamp: String(Date.now()),
      },
    });
    pinataFormData.append("pinataMetadata", pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 1,
    });
    pinataFormData.append("pinataOptions", pinataOptions);

    const pinataResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
      body: pinataFormData,
    });

    if (!pinataResponse.ok) {
      const errorText = await pinataResponse.text();
      console.error("Pinata IPFS Upload failed:", errorText);
      return NextResponse.json(
        { error: `Pinata upload failed: ${pinataResponse.statusText}` },
        { status: pinataResponse.status }
      );
    }

    const pinataResult = await pinataResponse.json();
    const cid = pinataResult.IpfsHash;

    return NextResponse.json({
      data: {
        cid,
        pinSize: pinataResult.PinSize,
        timestamp: pinataResult.Timestamp,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    console.error("POST /api/ipfs/upload error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
