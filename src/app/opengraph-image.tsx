import { ImageResponse } from "next/og";
export const alt = "RH Pilot, logiciel RH pour TPE et PME";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
 return new ImageResponse(<div style={{ width:"100%", height:"100%", display:"flex", flexDirection:"column", justifyContent:"space-between", padding:80, background:"#FAF7F2", color:"#14151A", fontFamily:"sans-serif" }}><div style={{ display:"flex", alignItems:"center", gap:20, fontSize:42, fontWeight:700 }}><span style={{ display:"flex", padding:18, background:"#E8432E", color:"white", borderRadius:20 }}>R</span>RH Pilot</div><div style={{ display:"flex", flexDirection:"column", gap:24 }}><div style={{ fontSize:68, fontWeight:700 }}>Gardez le fil de votre suivi RH.</div><div style={{ fontSize:28, color:"#4A4A4D" }}>Salariés · Parcours · Échéances · Documents</div></div><div style={{ fontSize:24 }}>rhpilot.fr</div></div>, size);
}
