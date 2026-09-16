import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"Harvest Tycoon",description:"Grow your farm, make new products and come back for fresh daily challenges.",icons:{icon:"/assets/harvest-tycoon-logo.png",shortcut:"/assets/harvest-tycoon-logo.png"}};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body>{children}</body></html>; }
