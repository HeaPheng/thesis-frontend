export const lessonsData = [
  {
    id: 1,
    title: "HTML & CSS Basics",
    description: "Learn the fundamentals of modern, responsive web design.",
    image: require("../assets/images/bg.jpg"),
    lessons: 22,
    units: 5,
    qcm: 12,
    coding: 8,

    content: {
      units: [
        // ================= UNIT 1 =================
        {
          id: "u1",
          title: "Introduction to HTML",
          lessons: [
            {
              id: "l1",
              title: "What is HTML?",
              content: `
## 📘 What is HTML?

HTML stands for **HyperText Markup Language**.  
It is the **skeleton** of every website.

### Why HTML matters?
- Structure  
- Semantics  
- SEO  
- Accessibility  

\`\`\`html
<h1>Hello World</h1>
<p>This is my first webpage</p>
\`\`\`
              `,
            },
            {
              id: "l2",
              title: "HTML Document Structure",
              content: `
## 📘 Basic HTML Document

Every HTML page starts with a simple structure:

\`\`\`html
<!DOCTYPE html>
<html>
  <head>
    <title>My Page</title>
  </head>
  <body>
    <h1>Hello</h1>
  </body>
</html>
\`\`\`

### Notes:
- <head> → metadata  
- <body> → visible content  
              `,
            },
          ],

          // ✅ CODING EXERCISE (Lesson → Coding → QCM)
          coding: [
            {
              id: "c1",
              title: "Create Your First HTML Heading",
              prompt:
                "Create an HTML page with a big heading using <h1> and a paragraph using <p>.",
              starterCode: `<!DOCTYPE html>
<html>
  <head>
    <title>Practice</title>
  </head>
  <body>
    <!-- Write your code below -->
  </body>
</html>`,
              solution: `<h1>Hello World</h1>
<p>This is my first webpage</p>`,
            },
          ],

          qcm: [
            {
              id: "q1",
              question: "What does HTML stand for?",
              options: [
                "HyperText Markup Language",
                "HighText Machine Language",
                "Hyperlink Text Mode Layer",
              ],
              answer: "HyperText Markup Language",
            },
            {
              id: "q2",
              question: "Which tag displays the largest heading?",
              options: ["<head>", "<h6>", "<h1>", "<p>"],
              answer: "<h1>",
            },
          ],
        },

        // ================= UNIT 2 =================
        {
          id: "u2",
          title: "Working with Text & Links",
          lessons: [
            {
              id: "l3",
              title: "Headings & Paragraphs",
              content: `
## Headings & Paragraphs

HTML provides 6 heading levels:

\`\`\`html
<h1>Big Title</h1>
<h2>Subtitle</h2>
<h3>Section Title</h3>
\`\`\`

Use paragraphs for text:

\`\`\`html
<p>This is a paragraph.</p>
\`\`\`
              `,
            },
            {
              id: "l4",
              title: "Links & Images",
              content: `
## Adding Links

\`\`\`html
<a href="https://google.com">Visit Google</a>
\`\`\`

## Adding Images

\`\`\`html
<img src="image.png" alt="Description" />
\`\`\`
              `,
            },
          ],

          coding: [
            {
              id: "c2",
              title: "Create a Link + Image",
              prompt:
                "Add a link to Google and add an image tag with alt text. You can use any image URL.",
              starterCode: `<!DOCTYPE html>
<html>
  <head>
    <title>Practice</title>
  </head>
  <body>
    <!-- 1) Add a link to Google -->
    <!-- 2) Add an image below -->
  </body>
</html>`,
              solution: `<a href="https://google.com">Visit Google</a>
<img src="https://via.placeholder.com/200" alt="Sample image" />`,
            },
          ],

          qcm: [
            {
              id: "q1",
              question: "Which HTML tag is used for a paragraph?",
              options: ["<para>", "<text>", "<p>", "<pg>"],
              answer: "<p>",
            },
            {
              id: "q2",
              question: "Which attribute sets the link destination?",
              options: ["url", "href", "src", "link"],
              answer: "href",
            },
          ],
        },

        // ================= UNIT 3 =================
        {
          id: "u3",
          title: "Introduction to CSS",
          lessons: [
            {
              id: "l5",
              title: "What is CSS?",
              content: `
## What is CSS?

CSS controls the **appearance** of a webpage.

\`\`\`css
h1 {
  color: blue;
  font-size: 30px;
}
\`\`\`
              `,
            },
            {
              id: "l6",
              title: "CSS Selectors",
              content: `
## CSS Selectors

\`\`\`css
/* Element selector */
p { color: red; }

/* Class selector */
.box { padding: 20px; }

/* ID selector */
#title { text-align: center; }
\`\`\`
              `,
            },
          ],

          coding: [
            {
              id: "c3",
              title: "Style a Heading and a Box",
              prompt:
                "Add CSS to make the <h1> blue and give the .box padding and border.",
              starterCode: `<!DOCTYPE html>
<html>
  <head>
    <title>Practice</title>
    <style>
      /* Write CSS here */
    </style>
  </head>
  <body>
    <h1 id="title">Hello CSS</h1>
    <div class="box">I am a box</div>
  </body>
</html>`,
              solution: `h1 { color: blue; }
.box { padding: 20px; border: 1px solid black; }`,
            },
          ],

          qcm: [
            {
              id: "q1",
              question: "Which CSS property changes text color?",
              options: ["font-size", "background", "color", "text-align"],
              answer: "color",
            },
            {
              id: "q2",
              question: "Which selector targets a class?",
              options: [".box", "#box", "box()", "*box"],
              answer: ".box",
            },
          ],
        },

        // ================= UNIT 4 =================
        {
          id: "u4",
          title: "Layouts & Flexbox",
          lessons: [
            {
              id: "l7",
              title: "Box Model",
              content: `
## 🧱 Box Model

Every HTML element is a box.

\`\`\`css
div {
  margin: 10px;
  padding: 20px;
  border: 1px solid black;
}
\`\`\`
              `,
            },
            {
              id: "l8",
              title: "Flexbox Basics",
              content: `
## ⚡ Flexbox Layout

\`\`\`css
.container {
  display: flex;
  justify-content: center;
  gap: 20px;
}
\`\`\`

Useful for modern layouts!
              `,
            },
          ],

          coding: [
            {
              id: "c4",
              title: "Make a Flex Row",
              prompt:
                "Turn the container into a flex row with spacing between items.",
              starterCode: `<!DOCTYPE html>
<html>
  <head>
    <title>Practice</title>
    <style>
      .container {
        /* Make this flexbox */
      }
      .item {
        background: #ddd;
        padding: 20px;
        border-radius: 8px;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="item">One</div>
      <div class="item">Two</div>
      <div class="item">Three</div>
    </div>
  </body>
</html>`,
              solution: `.container { display:flex; gap:20px; justify-content:center; }`,
            },
          ],

          qcm: [
            {
              id: "q1",
              question: "Which property enables Flexbox?",
              options: [
                "flexbox: on",
                "display: flex",
                "flex: enable",
                "layout: flex",
              ],
              answer: "display: flex",
            },
            {
              id: "q2",
              question: "Which CSS property adds space BETWEEN items?",
              options: ["margin", "padding", "gap", "space-between"],
              answer: "gap",
            },
          ],
        },

        // ================= UNIT 5 =================
        {
          id: "u5",
          title: "Finishing a Web Page",
          lessons: [
            {
              id: "l9",
              title: "Build Your First Webpage",
              content: `
## Final Mini Project

Create a webpage with:
- A header  
- An image  
- A paragraph  
- A list  
- A link  
              `,
            },
          ],

          coding: [
            {
              id: "c5",
              title: "Mini Project Layout",
              prompt:
                "Create a mini web page with a heading, image, list, and a link. Style it slightly using CSS.",
              starterCode: `<!DOCTYPE html>
<html>
  <head>
    <title>Mini Project</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      img { max-width: 200px; border-radius: 8px; }
    </style>
  </head>
  <body>
    <!-- Build your page here -->
  </body>
</html>`,
              solution: `<h1>My First Webpage</h1>
<img src="https://via.placeholder.com/200" alt="Project image" />
<p>Welcome to my first project!</p>
<ul>
  <li>Header</li>
  <li>Image</li>
  <li>List</li>
</ul>
<a href="https://google.com">Visit Google</a>`,
            },
          ],

          qcm: [
            {
              id: "q1",
              question: "Which tag should wrap the whole visible webpage?",
              options: ["<html>", "<body>", "<main>", "<section>"],
              answer: "<body>",
            },
            {
              id: "q2",
              question:
                "Which HTML tag is recommended for the main content?",
              options: ["<main>", "<content>", "<center>", "<section>"],
              answer: "<main>",
            },
          ],
        },
      ],
    },
  },
];
