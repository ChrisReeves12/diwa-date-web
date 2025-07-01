"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = RootLayout;
require("@/styles/globals.scss");
exports.metadata = {
    title: `${process.env.APP_NAME} | ${process.env.APP_TAGLINE}`,
    description: process.env.APP_TAGLINE,
};
function RootLayout({ children, }) {
    return (<html lang="en">
      <head>
        <meta name="viewport" content="initial-scale=1, width=device-width"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&family=Oswald:wght@200..700&display=swap" rel="stylesheet"/>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"/>
        <link rel="stylesheet" href="https://maxst.icons8.com/vue-static/landings/line-awesome/line-awesome/1.3.0/css/line-awesome.min.css"/>
      </head>
      <body>
        {children}
      </body>
    </html>);
}
//# sourceMappingURL=layout.jsx.map