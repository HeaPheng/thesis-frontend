// src/data/tipsData.js
import centerDivCover from "../assets/tips/center-div.jpg";
import textAlignCover from "../assets/tips/text-align.jpg";
import bootstrapCover from "../assets/tips/bootstrap.jpg";

const tipsData = [
    {
        slug: "center-a-div",
        title: "How to center a div (the 3 best ways)",
        summary:
            "Flexbox, Grid, and margin auto — the cleanest ways to center content.",
        level: "Beginner",
        date: "Dec 2025",
        tags: ["CSS", "Layout"],

        // ✅ NEW: image shown on Tips card + TipDetail header
        cover: centerDivCover,

        sections: [
            {
                heading: "1) Flexbox (most common)",
                text: "Use display:flex + justify-content + align-items on the parent element.",
                code: `.parent {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}`,
                // ✅ optional image inside the article section
                image: centerDivCover,
                caption: "Flexbox centering example",
            },
            {
                heading: "2) CSS Grid (super clean)",
                text: "Grid can center with one line: place-items:center.",
                code: `.parent {
  display: grid;
  place-items: center;
  min-height: 300px;
}`,
            },
            {
                heading: "3) margin: 0 auto (only horizontal)",
                text: "Works if you have a width on the element you want to center.",
                code: `.box {
  width: 300px;
  margin: 0 auto;
}`,
            },
        ],
    },

    {
        slug: "text-align-left",
        title: "Make text align left (even inside center layouts)",
        summary: "Fix text alignment without breaking your whole layout.",
        level: "Beginner",
        date: "Dec 2025",
        tags: ["CSS", "Typography"],

        // ✅ cover image
        cover: textAlignCover,

        sections: [
            {
                heading: "Quick fix",
                text: "Apply text-align:left on the element containing the text.",
                code: `.content {
  text-align: left;
}`,
                image: textAlignCover,
                caption: "Override alignment at the correct element",
            },
            {
                heading: "Common mistake",
                text: "If the parent has text-align:center, your text will inherit it. Override it on the child.",
                code: `.parent { text-align: center; }
.child { text-align: left; }`,
            },
        ],
    },

    {
        slug: "install-bootstrap-react",
        title: "Install Bootstrap + React-Bootstrap",
        summary: "One-time setup commands + the correct import.",
        level: "Beginner",
        date: "Dec 2025",
        tags: ["React", "Bootstrap"],

        // ✅ cover image
        cover: bootstrapCover,

        sections: [
            {
                heading: "Install",
                text: "Run these commands in your project folder.",
                code: `npm install react-bootstrap bootstrap`,
                image: bootstrapCover,
                caption: "Install Bootstrap dependencies",
            },
            {
                heading: "Import Bootstrap CSS",
                text: "Add this once (usually in src/index.js or App.js).",
                code: `import "bootstrap/dist/css/bootstrap.min.css";`,
            },
        ],
    },
];

export default tipsData;
