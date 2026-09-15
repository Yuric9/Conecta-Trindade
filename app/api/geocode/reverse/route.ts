import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');

  if (!lat || !lon) {
    return NextResponse.json({ error: 'Parâmetros lat e lon são obrigatórios.' }, { status: 400 });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);

  if (isNaN(latitude) || isNaN(longitude)) {
    return NextResponse.json({ error: 'Coordenadas inválidas.' }, { status: 400 });
  }

  try {
    const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    
    const response = await fetch(nominatimUrl, {
      headers: {
        'Accept-Language': 'pt-BR,pt;q=0.9',
        'User-Agent': 'ConectaTrindade/1.0 (https://conecta.trindade.go.gov.br; suporte@trindade.go.gov.br)',
      },
      next: { revalidate: 86400 }, // Cache response for 24h
    });

    if (!response.ok) {
      return NextResponse.json({ display_name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` });
    }

    const data = await response.json();
    return NextResponse.json({
      display_name: data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
      address: data.address || {},
    });
  } catch (error) {
    return NextResponse.json(
      { display_name: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}` },
      { status: 200 }
    );
  }
}
