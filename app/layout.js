/* app/layout.js */
/* 
  This is the root layout — it wraps every page in your app.
  We set up the HTML structure, metadata (page title, description),
  and import our global styles.
*/

import "./globals.css";

// This metadata shows up in browser tabs and search results
export const metadata = {
  title: "Steeple — Repurpose Your Sermons with AI",
  description: "Turn your weekly sermon into a week's worth of content. Blog posts, social media, discussion guides — all in your voice.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
