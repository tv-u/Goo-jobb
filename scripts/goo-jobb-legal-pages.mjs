import fs from "node:fs";
import path from "node:path";

const PUBLIC = path.join(process.cwd(), "public");
const SITE = "https://tv-u.github.io/Goo-jobb";

function esc(v) {
  return String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function page(name, title, description, content) {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="${SITE}/${name}/">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}/${name}/">
<style>
body{margin:0;background:#070707;color:#eee;font-family:system-ui;line-height:1.7}
main{max-width:900px;margin:auto;padding:30px}
.card{background:#111;border:1px solid #292929;border-radius:16px;padding:25px}
a{color:#64ffad}
</style>
</head>
<body>
<main>
<p><a href="${SITE}/">← GOO-JOBB Home</a></p>
<div class="card">${content}</div>
</main>
</body>
</html>`;

  const dir = path.join(PUBLIC, name);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,"index.html"),html);
}

page(
"about",
"About GOO-JOBB",
"Learn about GOO-JOBB, a job discovery platform aggregating publicly available employment opportunities.",
`<h1>About GOO-JOBB</h1>
<p>GOO-JOBB is a job discovery and search platform designed to help candidates discover employment opportunities from publicly available job sources.</p>
<h2>How GOO-JOBB Works</h2>
<p>Listings are collected from public feeds, APIs and job sources, normalized and indexed for easier discovery.</p>
<h2>Applications</h2>
<p>GOO-JOBB does not employ candidates or process applications. Applications are completed on the original employer or job-source website.</p>
<h2>Accuracy</h2>
<p>Job availability can change after a listing is indexed. Always verify the vacancy and requirements on the original source before applying.</p>`
);

page(
"terms",
"Terms and Conditions | GOO-JOBB",
"Terms and conditions governing use of the GOO-JOBB website.",
`<h1>Terms and Conditions</h1>
<h2>Use of Service</h2>
<p>You may use GOO-JOBB to discover publicly available employment opportunities for lawful purposes.</p>
<h2>External Sources</h2>
<p>Job listings may link to third-party websites. Their terms, privacy policies and application processes apply when you leave GOO-JOBB.</p>
<h2>No Employment Guarantee</h2>
<p>Listing a job does not constitute an endorsement, employment offer or guarantee of hiring.</p>
<h2>Availability</h2>
<p>We may modify, remove or update listings and website functionality without notice.</p>
<h2>Acceptable Use</h2>
<p>You must not abuse the service, attempt unauthorized access, interfere with the website or use automated systems in a manner that violates applicable laws or source policies.</p>`
);

page(
"privacy",
"Privacy Policy | GOO-JOBB",
"Privacy information for visitors and users of GOO-JOBB.",
`<h1>Privacy Policy</h1>
<h2>Information</h2>
<p>GOO-JOBB is designed primarily as a public job-discovery website. We do not require candidates to submit job applications through our platform.</p>
<h2>Third Parties</h2>
<p>External job websites and advertising providers may process information according to their own policies.</p>
<h2>Cookies and Advertising</h2>
<p>Advertising technology may use cookies or similar technologies where permitted and configured by the advertising provider.</p>
<h2>Security</h2>
<p>Reasonable technical measures are used to protect the website infrastructure, but no internet service can guarantee absolute security.</p>
<h2>Contact</h2>
<p>For privacy questions, use the contact information provided on the Contact page.</p>`
);

page(
"security",
"Security | GOO-JOBB",
"Security practices and vulnerability reporting information for GOO-JOBB.",
`<h1>Security</h1>
<h2>Infrastructure</h2>
<p>GOO-JOBB is delivered through GitHub Pages and automated deployment workflows.</p>
<h2>Responsible Disclosure</h2>
<p>If you discover a security issue, do not attempt to access another person's data. Provide a clear description, reproduction steps and affected URL through the official contact channel.</p>
<h2>Data Minimization</h2>
<p>GOO-JOBB does not operate an application-submission system for candidates.</p>
<h2>Third-Party Services</h2>
<p>External job sources and advertising services operate independently and may have separate security controls.</p>`
);

page(
"disclaimer",
"Disclaimer | GOO-JOBB",
"Important job listing, external-link and informational disclaimer for GOO-JOBB.",
`<h1>Disclaimer</h1>
<p>GOO-JOBB is an independent job discovery platform.</p>
<p>We do not guarantee that any job is still available, that an employer will respond, or that information supplied by an external source remains current.</p>
<p>Always verify salary, location, eligibility, employment status, application requirements and employer identity on the original source.</p>
<p>GOO-JOBB is not responsible for third-party websites, recruitment decisions, employment contracts, payments, interviews or hiring outcomes.</p>`
);

page(
"contact",
"Contact GOO-JOBB",
"Contact information and job listing reporting instructions for GOO-JOBB.",
`<h1>Contact GOO-JOBB</h1>
<h2>Listing Issues</h2>
<p>If you find an expired, duplicate or incorrect listing, report the exact job URL and explain the issue.</p>
<h2>Security</h2>
<p>For security issues, provide only the minimum information needed to reproduce the issue. Do not include passwords, authentication tokens or private information.</p>
<h2>General Feedback</h2>
<p>Feedback about search quality, categorization and usability is welcome.</p>`
);

console.log("LEGAL PAGES CREATED");
