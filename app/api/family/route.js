import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

let fallbackDb = [
  {
    id: "g1",
    name: "Grandfather Name",
    generation: 1,
    occupation: "Retired Engineer",
    location: "Abu Dhabi, UAE",
    socialMedia: "https://facebook.com",
    imageUrl: "",
    spouseName: "Grandmother Name"
  }
];

async function getDb() {
  if (process.env.KV_REST_API_URL) {
    const data = await kv.get('family_data');
    return data || fallbackDb;
  }
  return fallbackDb;
}

async function saveDb(data) {
  if (process.env.KV_REST_API_URL) {
    await kv.set('family_data', data);
  } else {
    fallbackDb = data;
  }
}

export async function GET() {
  const data = await getDb();
  return NextResponse.json(data);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const data = await getDb();
    
    const newMember = {
      id: Date.now().toString(),
      name: body.name || "Unknown",
      generation: parseInt(body.generation) || 1,
      occupation: body.occupation || "",
      location: body.location || "",
      socialMedia: body.socialMedia || "",
      imageUrl: body.imageUrl || "",
      spouseName: body.spouseName || ""
    };
    
    data.push(newMember);
    await saveDb(data);
    
    return NextResponse.json({ success: true, member: newMember });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
