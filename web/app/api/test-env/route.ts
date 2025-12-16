import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    env_exists: {
      BITOPRO_API_KEY: !!process.env.BITOPRO_API_KEY,
      BITOPRO_API_SECRET: !!process.env.BITOPRO_API_SECRET,
      BITOPRO_EMAIL: !!process.env.BITOPRO_EMAIL,
    },
    values: {
      BITOPRO_API_KEY: process.env.BITOPRO_API_KEY?.substring(0, 8) + '...',
      BITOPRO_API_SECRET: process.env.BITOPRO_API_SECRET?.substring(0, 10) + '...',
      BITOPRO_EMAIL: process.env.BITOPRO_EMAIL,
    },
    all_bitopro_vars: Object.keys(process.env).filter(key => key.startsWith('BITOPRO')),
    node_env: process.env.NODE_ENV,
  });
}
