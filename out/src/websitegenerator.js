"use strict";
const fs = require("fs");
const marked = require("marked");
const path = require("path");
var Main;
(function (Main) {
    "use strict";
    const fileContents = {};
    Main.themeFiles = ["default.css"];
    ["page.html"].concat(Main.themeFiles).forEach(fileName => {
        const filePath = path.join(__dirname, "content", fileName);
        fileContents[fileName] = fs.readFileSync(filePath).toString();
    });
    function generate(elements, options) {
        if (!fs.existsSync(options.dir)) {
            throw new Error(`The specified folder '${options.dir}' does not exist.`);
        }
        const themeFilePath = options.themeName ? `${options.themeName}.css` : Main.themeFiles[0];
        const writeFile = options.writeFile || ((filePath, content) => {
            const dirList = [];
            let dirName = path.dirname(filePath);
            while (!fs.existsSync(dirName)) {
                dirList.push(dirName);
                dirName = path.resolve(dirName, "..");
            }
            while (dirName = dirList.pop()) {
                fs.mkdirSync(dirName);
            }
            fs.writeFileSync(filePath, content);
        });
        const queue = [];
        Main.themeFiles.forEach((cssFileName) => {
            writeFile(path.join(options.dir, cssFileName), fileContents[cssFileName]);
        });
        Generator.generatePage("", path.join(options.dir, "index.html"), {
            productName: options.resources.productName,
            copyright: options.resources.copyright,
            description: options.resources.productDescription,
            themeFilePath: themeFilePath,
            elements: elements,
            processLinkElement: (element) => {
                queue.push({
                    parentName: null,
                    element: element
                });
            },
            writeFile: writeFile,
        });
        while (queue.length) {
            const queueItem = queue.shift();
            const element = queueItem.element;
            const fullName = queueItem.parentName ? queueItem.parentName + "." + element.name : element.name;
            Generator.generatePage(fullName, path.join(options.dir, `${getFileName(fullName)}`), {
                productName: options.resources.productName,
                copyright: options.resources.copyright,
                pageName: `${element.name} ${getKindText(element.kind)}`,
                description: element.documentation,
                themeFilePath: themeFilePath,
                elements: element.members || element.parameters || [],
                processLinkElement: (element) => {
                    queue.push({
                        parentName: fullName,
                        element: element
                    });
                },
                writeFile: writeFile,
            });
        }
    }
    Main.generate = generate;
    function getFileName(elementName, asLink) {
        let result = "";
        if (elementName.startsWith("\"")) {
            const secondIndexOfQuote = elementName.indexOf("\"", 1);
            result = elementName.substr(1, secondIndexOfQuote - 1).replace(":", "/").replace(/\\/g, "/");
            elementName = elementName.substr(secondIndexOfQuote + 2);
        }
        if (elementName) {
            result += "/" + elementName + ".html";
        }
        else {
            result += (asLink ? "/" : "/index.html");
        }
        return result.startsWith("/") ? result : "/" + result;
    }
    function getKindText(kind) {
        switch (kind) {
            case 217 /* ClassDeclaration */:
                return "Class";
            case 220 /* EnumDeclaration */:
                return "Enum";
            case 216 /* FunctionDeclaration */:
                return "Function";
            case 218 /* InterfaceDeclaration */:
                return "Interface";
            case 221 /* ModuleDeclaration */:
                return "Module";
            case 214 /* VariableDeclaration */:
                return "Value";
            default:
                return "<Unknown>";
        }
    }
    var Generator;
    (function (Generator) {
        const linkable = {};
        linkable[221 /* ModuleDeclaration */] = true;
        function generatePage(fullName, path, options) {
            const pageInfo = generatePageContent(fullName, options);
            const pageHtml = format(fileContents["page.html"], {
                productName: options.productName,
                copyright: options.copyright,
                title: (options.pageName || "Home") + " - " + options.productName,
                titleText: options.pageName || "API Documentation",
                description: marked(options.description),
                cssFileName: options.themeFilePath,
                breadCrumb: generatePageBreadCrumb(fullName),
                content: pageInfo.content,
                rightNav: pageInfo.rightNav
            });
            options.writeFile(path, pageHtml);
        }
        Generator.generatePage = generatePage;
        function generatePageBreadCrumb(fullName) {
            let result = `
<ul>
    <li class="main-breadcrumb-home">
        <a href="/" title="Home">
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" x="0px" y="0px" width="20px" height="20px" viewBox="0 0 512 512" enable-background="new 0 0 512 512" xml:space="preserve">
                <path d="M502.625,328.563c-6.25,6.25-14.438,9.375-22.625,9.375s-16.375-3.125-22.625-9.375L448,319.188V475H320V315H192v160H64  V319.188l-9.375,9.375c-12.5,12.5-32.75,12.5-45.25,0s-12.5-32.75,0-45.25L256,36.688l246.625,246.625  C515.125,295.813,515.125,316.063,502.625,328.563z"/>
            </svg>
        </a>
    </li>`;
            const parts = [];
            if (fullName.startsWith("\"")) {
                const secondIndexOfQuote = fullName.indexOf("\"", 1);
                parts.push(fullName.substr(0, secondIndexOfQuote + 1));
                fullName = fullName.substr(secondIndexOfQuote + 2);
            }
            if (fullName) {
                parts.push.apply(parts, fullName.split("."));
            }
            const currentElementName = parts.pop();
            parts.reduce((prev, current) => {
                const nameUptoNow = prev ? prev + "." + current : current;
                result += `
    <li>
        <a href="${getFileName(nameUptoNow, true)}">${current}</a>
    </li>`;
                return nameUptoNow;
            }, "");
            if (currentElementName) {
                result += `
    <li class="main-breadcrumb-currentitem">${currentElementName}</li>
</ul>`;
            }
            return result;
        }
        function generatePageContent(fullName, options) {
            const result = {
                content: "",
                rightNav: "<ul>",
            };
            sections.forEach(section => {
                const current = generateSection(fullName, section, options.elements.filter(el => {
                    return el.kind === section.kind
                        && ((el.name && !section.noName) || (!el.name && section.noName));
                }), options.processLinkElement);
                if (current) {
                    result.content += current;
                    result.rightNav += `
    <li>
        <a class="docs-rightnav-link" href="#${section.title}">${section.title}</a>
    </li>
`;
                }
            });
            const others = generateSection(fullName, { kind: null, title: "Others" }, options.elements.filter(el => {
                return !sections.some(section => section.kind === el.kind);
            }), options.processLinkElement);
            if (others) {
                result.content += others;
            }
            result.rightNav += "</ul>";
            return result;
        }
        const sections = [
            { kind: 221 /* ModuleDeclaration */, title: "Modules" },
            { kind: 218 /* InterfaceDeclaration */, title: "Interfaces" },
            { kind: 219 /* TypeAliasDeclaration */, title: "Types" },
            { kind: 214 /* VariableDeclaration */, title: "Values" },
            { kind: 220 /* EnumDeclaration */, title: "Enums" },
            { kind: 216 /* FunctionDeclaration */, title: "Functions" },
            { kind: 217 /* ClassDeclaration */, title: "Classes" },
            { kind: 142 /* PropertyDeclaration */, title: "Properties" },
            { kind: 141 /* PropertySignature */, title: "Properties" },
            { kind: 144 /* MethodDeclaration */, title: "Methods" },
            { kind: 143 /* MethodSignature */, title: "Methods" },
            { kind: 144 /* MethodDeclaration */, title: "Constructors", noName: true },
            { kind: 143 /* MethodSignature */, title: "Constructors", noName: true },
        ];
        function generateSection(parentName, section, elements, processLinkElement) {
            if (!elements.length) {
                return "";
            }
            return format(`
<section class="docs-section">
    <h3 id="{sectionTitle}">{sectionTitle}</h3>
    {sectionContent}
    <a class="docs-section-toplink" href="#">
        <span style="padding-right: 4px">Go to top</span>
        <svg xmlns:svg="http://www.w3.org/2000/svg" xmlns="http://www.w3.org/2000/svg" version="1.0" width="20px" height="20px" viewBox="-500, -600 ,1000, 1200">
            <polygon style="stroke:none; fill:#000000;" points="100,600 100,-200  500,200 500,-100  0,-600  -500,-100 -500,200 -100,-200 -100,600 "/>
        </svg>
    </a>
</section>`, {
                sectionTitle: section.title,
                sectionContent: generateTable(parentName, elements, processLinkElement),
            });
        }
        function generateTable(parentName, elements, processLinkElement) {
            let result = `
<table class="docs-section-table">
    <thead>
        <tr>
            <td>Name</td>
            <td>Description</td>
        </tr>
    </thead>`;
            elements.forEach(element => {
                let elementName = element.name;
                if (!elementName && (element.kind === 144 /* MethodDeclaration */ || element.kind === 143 /* MethodSignature */)) {
                    elementName = "ctor";
                }
                if (isLinkableKind(element.kind) && elementName !== "ctor") {
                    const fullName = parentName ? parentName + "." + elementName : elementName;
                    elementName = `<a href="${getFileName(fullName, true)}">${elementName}</a>`;
                    processLinkElement(element);
                }
                result += `
    <tr>
        <td>${elementName}</td>
        <td>${marked(element.documentation || "")}</td>
    </tr>`;
            });
            result += `
</table>`;
            return result;
        }
        function isLinkableKind(kind) {
            return kind === 221 /* ModuleDeclaration */
                || kind === 218 /* InterfaceDeclaration */
                || kind === 220 /* EnumDeclaration */
                || kind === 216 /* FunctionDeclaration */
                || kind === 217 /* ClassDeclaration */;
        }
        function format(input, params) {
            const result = input.replace(/\{[a-zA-Z\d]*}/g, (param) => {
                const key = param.substr(1, param.length - 2);
                return params[key];
            });
            return result;
        }
    })(Generator || (Generator = {}));
})(Main || (Main = {}));
module.exports = Main;
