import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { name, contact, service, size, selectedExtras, time, price } = body;

    const { data, error } = await resend.emails.send({
      from: "HEXA CLEAN <onboarding@resend.dev>",
      to: ["meischel.meischelowy@gmail.com"],
      subject: "Neue Anfrage von HEXA CLEAN",
      html: `
        <h2>Neue Anfrage von HEXA CLEAN</h2>
        <p><strong>Name:</strong> ${name || "-"}</p>
        <p><strong>Kontakt:</strong> ${contact || "-"}</p>
        <p><strong>Leistung:</strong> ${service}</p>
        <p><strong>Grösse:</strong> ${size} m²</p>
        <p><strong>Zusatzleistungen:</strong> ${
          selectedExtras?.length ? selectedExtras.join(", ") : "Keine"
        }</p>
        <p><strong>Termin:</strong> ${time}</p>
        <p><strong>Preisspanne:</strong> ${price}</p>
      `,
    });

    if (error) {
      return Response.json({ success: false, error }, { status: 500 });
    }

    return Response.json({ success: true, data });
  } catch {
    return Response.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}