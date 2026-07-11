import { EditorView, Decoration, ViewPlugin, WidgetType, keymap, placeholder as cmPlaceholder } from "https://esm.sh/@codemirror/view@6.36.4?deps=@codemirror/state@6.5.2";
import { EditorState, RangeSetBuilder, Compartment, Annotation } from "https://esm.sh/@codemirror/state@6.5.2";
import { syntaxTree, ensureSyntaxTree, HighlightStyle, syntaxHighlighting, foldKeymap } from "https://esm.sh/@codemirror/language@6.10.8?deps=@codemirror/state@6.5.2,@codemirror/view@6.36.4";
import { history, historyKeymap, defaultKeymap, indentWithTab } from "https://esm.sh/@codemirror/commands@6.8.0?deps=@codemirror/state@6.5.2,@codemirror/view@6.36.4";
import { markdown, markdownLanguage } from "https://esm.sh/@codemirror/lang-markdown@6.3.2?deps=@codemirror/state@6.5.2,@codemirror/view@6.36.4,@codemirror/language@6.10.8";
import { languages } from "https://esm.sh/@codemirror/language-data@6.5.1?deps=@codemirror/state@6.5.2,@codemirror/view@6.36.4,@codemirror/language@6.10.8";
import { tags as t } from "https://esm.sh/@lezer/highlight@1.2.1";


const accent = "#4f8ef7";

const codeHighlightStyle = HighlightStyle.define([
    { tag: [t.keyword, t.modifier, t.controlKeyword, t.operatorKeyword], color: "#c792ea" },
    { tag: [t.definitionKeyword, t.moduleKeyword], color: "#c792ea" },
    { tag: [t.string, t.special(t.string), t.regexp], color: "#c3e88d" },
    { tag: [t.number, t.bool, t.atom, t.null], color: "#f78c6c" },
    { tag: [t.function(t.variableName), t.function(t.propertyName)], color: "#82aaff" },
    { tag: [t.propertyName], color: "#80cbc4" },
    { tag: [t.variableName, t.attributeName], color: "#e8e8e8" },
    { tag: [t.typeName, t.className, t.namespace], color: "#ffcb6b" },
    { tag: [t.tagName], color: "#f07178" },
    { tag: [t.comment, t.lineComment, t.blockComment], color: "#5c6370", fontStyle: "italic" },
    { tag: [t.operator, t.punctuation, t.separator, t.bracket], color: "#89ddff" },
    { tag: [t.meta], color: "#494949" },
    { tag: [t.invalid], color: "#ff5370" },
]);

const markdownStyle = HighlightStyle.define([
    { tag: t.heading, fontWeight: "700" },
    { tag: t.strong, fontWeight: "700", color: "#ffffff" },
    { tag: t.emphasis, fontStyle: "italic", color: "var(--app-text-primary, #e8e8e8)" },
    { tag: t.strikethrough, textDecoration: "line-through", color: "var(--app-text-muted, #888)" },
    { tag: t.monospace, fontFamily: "var(--app-font-mono, 'SF Mono', monospace)", color: "#f78c6c" },
    { tag: t.link, color: accent, textDecoration: "none" },
    { tag: t.url, color: "var(--app-text-muted, #6a93b8)" },
    { tag: t.processingInstruction, color: "var(--app-text-muted, #6b6b6b)" },
    { tag: t.string, color: accent },
]);


function selectionTouchesRange(state, from, to) {
    for (const range of state.selection.ranges) {
        if (range.from <= to && range.to >= from) return true;
    }
    return false;
}

function selectionTouchesLines(state, from, to) {
    const lineFrom = state.doc.lineAt(from).from;
    const lineTo = state.doc.lineAt(to).to;
    return selectionTouchesRange(state, lineFrom, lineTo);
}


class HrWidget extends WidgetType {
    toDOM() {
        const hr = document.createElement("div");
        hr.className = "cm-lp-hr";
        return hr;
    }
    ignoreEvent() { return false; }
}


const hiddenMark = Decoration.replace({});
const headingLine = (level) => Decoration.line({ class: `cm-lp-heading cm-lp-h${level}` });
const quoteLine = Decoration.line({ class: "cm-lp-quote" });
const codeLine = Decoration.line({ class: "cm-lp-codeline" });
const codeLineFirst = Decoration.line({ class: "cm-lp-codeline cm-lp-codeline-first" });
const codeLineLast = Decoration.line({ class: "cm-lp-codeline cm-lp-codeline-last" });


function buildDecorations(view) {
    const { state } = view;
    const widgets = [];
    const tree = ensureSyntaxTree(state, state.doc.length, 5000) || syntaxTree(state);

    {
        tree.iterate({
            enter: (node) => {
                const name = node.name;

                if (/^ATXHeading(\d)$/.test(name)) {
                    const level = Number(name.slice(-1));
                    const line = state.doc.lineAt(node.from);
                    widgets.push({ from: line.from, to: line.from, deco: headingLine(level), side: -1 });
                    return;
                }

                if (name === "HeaderMark") {
                    if (!selectionTouchesLines(state, node.from, node.to)) {
                        let end = node.to;
                        if (state.doc.sliceString(end, end + 1) === " ") end += 1;
                        widgets.push({ from: node.from, to: end, deco: hiddenMark, side: 1 });
                    }
                    return;
                }

                if (name === "HorizontalRule") {
                    if (!selectionTouchesLines(state, node.from, node.to)) {
                        widgets.push({
                            from: node.from, to: node.to,
                            deco: Decoration.replace({ widget: new HrWidget() }),
                            side: 1
                        });
                    }
                    return;
                }

                if (name === "Blockquote") {
                    let pos = node.from;
                    while (pos <= node.to) {
                        const line = state.doc.lineAt(pos);
                        widgets.push({ from: line.from, to: line.from, deco: quoteLine, side: -1 });
                        if (line.to + 1 > node.to) break;
                        pos = line.to + 1;
                    }
                    return;
                }

                if (name === "FencedCode") {
                    const startLine = state.doc.lineAt(node.from).number;
                    const endLine = state.doc.lineAt(node.to).number;
                    for (let n = startLine; n <= endLine; n++) {
                        const line = state.doc.line(n);
                        let deco = codeLine;
                        if (n === startLine) deco = codeLineFirst;
                        else if (n === endLine) deco = codeLineLast;
                        widgets.push({ from: line.from, to: line.from, deco, side: -1 });
                    }
                    return;
                }

                if (name === "CodeInfo") {
                    if (!selectionTouchesLines(state, node.from, node.to)) {
                        widgets.push({ from: node.from, to: node.to, deco: hiddenMark, side: 1 });
                    }
                    return;
                }

                if (name === "CodeMark") {
                    const parent = node.node.parent;
                    if (parent && parent.name === "FencedCode") {
                        if (!selectionTouchesLines(state, node.from, node.to)) {
                            widgets.push({ from: node.from, to: node.to, deco: hiddenMark, side: 1 });
                        }
                    } else {
                        const range = parent ? { from: parent.from, to: parent.to } : { from: node.from, to: node.to };
                        if (!selectionTouchesRange(state, range.from, range.to)) {
                            widgets.push({ from: node.from, to: node.to, deco: hiddenMark, side: 1 });
                        }
                    }
                    return;
                }

                if (name === "EmphasisMark" || name === "StrongEmphasisMark" ||
                    name === "StrikethroughMark" ||
                    name === "SubscriptMark" || name === "SuperscriptMark") {
                    const parent = node.node.parent;
                    const range = parent ? { from: parent.from, to: parent.to } : { from: node.from, to: node.to };
                    if (!selectionTouchesRange(state, range.from, range.to)) {
                        widgets.push({ from: node.from, to: node.to, deco: hiddenMark, side: 1 });
                    }
                    return;
                }

                if (name === "Link") {
                    if (!selectionTouchesRange(state, node.from, node.to)) {
                        const text = state.doc.sliceString(node.from, node.to);
                        const m = /^\[([^\]]*)\]\(([^)]*)\)$/.exec(text);
                        if (m) {
                            const labelStart = node.from + 1;
                            const labelEnd = labelStart + m[1].length;
                            widgets.push({ from: node.from, to: node.from + 1, deco: hiddenMark, side: 1 });
                            widgets.push({ from: labelEnd, to: node.to, deco: hiddenMark, side: 1 });
                        }
                    }
                    return;
                }
            }
        });
    }

    const safe = widgets.filter((w) => {
        if (w.side !== 1) return true;
        if (w.from === w.to) return true;
        return state.doc.lineAt(w.from).number === state.doc.lineAt(w.to).number;
    });

    safe.sort((a, b) => a.from - b.from || a.side - b.side);

    const builder = new RangeSetBuilder();
    const atomicBuilder = new RangeSetBuilder();
    let lastFrom = -1, lastTo = -1;
    let atomLastTo = -1;
    for (const w of safe) {
        if (w.from < lastTo || (w.from === lastFrom && w.to === lastTo)) continue;
        builder.add(w.from, w.to, w.deco);
        lastFrom = w.from;
        lastTo = Math.max(lastTo, w.to);
        if (w.from < w.to && w.from >= atomLastTo) {
            atomicBuilder.add(w.from, w.to, w.deco);
            atomLastTo = w.to;
        }
    }
    return { decorations: builder.finish(), atomic: atomicBuilder.finish() };
}


const livePreview = ViewPlugin.fromClass(
    class {
        constructor(view) {
            const built = buildDecorations(view);
            this.decorations = built.decorations;
            this.atomic = built.atomic;
        }
        update(update) {
            if (update.docChanged || update.viewportChanged || update.selectionSet) {
                const built = buildDecorations(update.view);
                this.decorations = built.decorations;
                this.atomic = built.atomic;
            }
        }
    },
    {
        decorations: (v) => v.decorations,
        provide: (plugin) =>
            EditorView.atomicRanges.of((view) => view.plugin(plugin)?.atomic || Decoration.none),
    }
);


const editorTheme = EditorView.theme({
    "&": {
        color: "var(--app-text-primary, #e8e8e8)",
        backgroundColor: "transparent",
        height: "100%",
        fontSize: "15.5px",
    },
    ".cm-scroller": {
        fontFamily: "var(--app-font, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif)",
        lineHeight: "1.75",
        overflowY: "auto",
        overflowX: "hidden",
        padding: "18px 0 60px",
    },
    ".cm-content": { caretColor: "#ffffff", maxWidth: "100%" },
    "&.cm-focused": { outline: "none" },
    ".cm-line": { padding: "0" },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: accent, borderLeftWidth: "2px" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
        backgroundColor: "rgba(79, 142, 247, 0.22)",
    },
    ".cm-placeholder": { color: "var(--app-text-muted, #555)", fontStyle: "italic" },

    ".cm-lp-heading": { fontWeight: "700", color: "#ffffff", lineHeight: "1.35" },
    ".cm-lp-h1": { fontSize: "1.75em", padding: "0.5em 0 0.2em" },
    ".cm-lp-h2": { fontSize: "1.45em", padding: "0.5em 0 0.2em" },
    ".cm-lp-h3": { fontSize: "1.22em", padding: "0.4em 0 0.15em" },
    ".cm-lp-h4": { fontSize: "1.08em", padding: "0.4em 0 0.15em" },
    ".cm-lp-h5": { fontSize: "1em", color: "#dddddd" },
    ".cm-lp-h6": { fontSize: "0.92em", color: "#bbbbbb" },

    ".cm-lp-hr": {
        display: "inline-block",
        width: "100%",
        borderTop: "1px solid var(--app-border, #242424)",
        verticalAlign: "middle",
    },

    ".cm-lp-quote": {
        borderLeft: "3px solid var(--app-accent, #4f8ef7)",
        paddingLeft: "14px",
        color: "var(--app-text-secondary, #aaa)",
        fontStyle: "italic",
    },

    ".cm-lp-codeline": {
        backgroundColor: "rgba(140, 140, 140, 0.08)",
        fontFamily: "var(--app-font-mono, 'SF Mono', 'Fira Code', monospace)",
        fontSize: "0.92em",
        padding: "0 16px",
    },
    ".cm-lp-codeline-first": {
        borderTopLeftRadius: "8px",
        borderTopRightRadius: "8px",
        paddingTop: "12px",
    },
    ".cm-lp-codeline-last": {
        borderBottomLeftRadius: "8px",
        borderBottomRightRadius: "8px",
        paddingBottom: "12px",
    },

    ".cm-scroller::-webkit-scrollbar": { width: "10px" },
    ".cm-scroller::-webkit-scrollbar-thumb": {
        backgroundColor: "rgba(255,255,255,0.14)",
        borderRadius: "5px",
        border: "2px solid transparent",
        backgroundClip: "content-box",
    },
    ".cm-scroller::-webkit-scrollbar-thumb:hover": {
        backgroundColor: "rgba(255,255,255,0.25)",
    },
});

const programmaticUpdate = Annotation.define();

export function createMarkdownEditor({ parent, doc = "", placeholder = "", onChange = null, onSave = null }) {
    const editableComp = new Compartment();
    const listeners = [];

    if (onChange) {
        listeners.push(EditorView.updateListener.of((update) => {
            if (!update.docChanged) return;
            if (update.transactions.some((tr) => tr.annotation(programmaticUpdate))) return;
            onChange(update.state.doc.toString());
        }));
    }

    const saveKeymap = onSave ? [keymap.of([{
        key: "Mod-s",
        run: () => { onSave(); return true; }
    }])] : [];

    const state = EditorState.create({
        doc,
        extensions: [
            history(),
            keymap.of([...defaultKeymap, ...historyKeymap, ...foldKeymap, indentWithTab]),
            ...saveKeymap,
            markdown({ base: markdownLanguage, codeLanguages: languages, addKeymap: true }),
            syntaxHighlighting(codeHighlightStyle),
            syntaxHighlighting(markdownStyle),
            livePreview,
            EditorView.lineWrapping,
            cmPlaceholder(placeholder),
            editorTheme,
            editableComp.of(EditorView.editable.of(true)),
            ...listeners,
        ],
    });

    const view = new EditorView({ state, parent });

    return {
        view,
        getValue: () => view.state.doc.toString(),
        setValue: (text) => {
            view.dispatch({
                changes: { from: 0, to: view.state.doc.length, insert: text || "" },
                selection: { anchor: 0 },
                annotations: programmaticUpdate.of(true),
            });
        },
        focus: () => view.focus(),
        setEditable: (editable) => {
            view.dispatch({ effects: editableComp.reconfigure(EditorView.editable.of(!!editable)) });
        },
        destroy: () => view.destroy(),
    };
}
