import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Extension } from "@tiptap/core";
import { useEffect, forwardRef, useImperativeHandle, useState, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Tag } from "lucide-react";

interface WysiwygEditorProps {
  content: string;
  onChange: (content: string) => void;
  onImageUpload?: (file: File) => Promise<string>;
  onTagClick?: (tag: string) => void;
  allTags?: string[];
  placeholder?: string;
  className?: string;
  editable?: boolean;
}

export interface WysiwygEditorRef {
  editor: Editor | null;
  insertImage: (url: string, alt?: string) => void;
  focus: () => void;
  insertTag: (tag: string) => void;
}

// Custom extension for markdown-like input rules
const MarkdownShortcuts = Extension.create({
  name: "markdownShortcuts",

  addInputRules() {
    return [];
  },
});

// Tag suggestion dropdown component
function TagSuggestions({
  tags,
  selectedIndex,
  onSelect,
  position,
}: {
  tags: string[];
  selectedIndex: number;
  onSelect: (tag: string) => void;
  position: { top: number; left: number };
}) {
  if (tags.length === 0) return null;

  return (
    <div
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 max-h-48 overflow-auto min-w-[160px]"
      style={{ top: position.top, left: position.left }}
    >
      {tags.map((tag, index) => (
        <div
          key={tag}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm",
            index === selectedIndex ? "bg-primary/10 text-primary" : "hover:bg-gray-50"
          )}
          onClick={() => onSelect(tag)}
        >
          <Tag className="h-3 w-3 text-gray-400" />
          <span>{tag}</span>
        </div>
      ))}
    </div>
  );
}

export const WysiwygEditor = forwardRef<WysiwygEditorRef, WysiwygEditorProps>(
  ({ content, onChange, onImageUpload, onTagClick, allTags = [], placeholder = "开始输入...", className = "", editable = true }, ref) => {
    const [showTagSuggestions, setShowTagSuggestions] = useState(false);
    const [tagQuery, setTagQuery] = useState("");
    const [selectedTagIndex, setSelectedTagIndex] = useState(0);
    const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // Filter tags based on query
    const filteredTags = allTags.filter((tag) =>
      tag.toLowerCase().includes(tagQuery.toLowerCase())
    );

    // Handle tag selection
    const handleSelectTag = useCallback((tag: string) => {
      if (editor) {
        // Delete the # and query text
        const { state } = editor;
        const { selection } = state;
        const from = selection.from - tagQuery.length - 1; // -1 for the #
        const to = selection.from;
        
        editor.chain()
          .focus()
          .deleteRange({ from, to })
          .insertContent(`#${tag} `)
          .run();
      }
      setShowTagSuggestions(false);
      setTagQuery("");
    }, [tagQuery]);

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
            HTMLAttributes: {
              class: "wysiwyg-bullet-list",
            },
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
            HTMLAttributes: {
              class: "wysiwyg-ordered-list",
            },
          },
          listItem: {
            HTMLAttributes: {
              class: "wysiwyg-list-item",
            },
          },
          heading: {
            levels: [1, 2, 3],
          },
          // Enable hard break for Shift+Enter
          hardBreak: {
            keepMarks: true,
          },
        }),
        Image.configure({
          inline: false,
          allowBase64: true,
          HTMLAttributes: {
            class: "wysiwyg-image",
          },
        }),
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        }),
        MarkdownShortcuts,
      ],
      content: convertMarkdownToHtml(content),
      editable,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();
        const markdown = convertHtmlToMarkdown(html);
        onChange(markdown);
        
        // Check for # tag input
        const { state } = editor;
        const { selection } = state;
        const { $from } = selection;
        
        // Get text before cursor
        const textBefore = $from.parent.textContent.slice(0, $from.parentOffset);
        const hashMatch = textBefore.match(/#([^\s#]*)$/);
        
        if (hashMatch) {
          setTagQuery(hashMatch[1]);
          setShowTagSuggestions(true);
          setSelectedTagIndex(0);
          
          // Calculate position for suggestions dropdown
          const coords = editor.view.coordsAtPos(selection.from);
          if (containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            setSuggestionPosition({
              top: coords.bottom - containerRect.top + 4,
              left: coords.left - containerRect.left,
            });
          }
        } else {
          setShowTagSuggestions(false);
          setTagQuery("");
        }
      },
      editorProps: {
        attributes: {
          class: "wysiwyg-editor-content focus:outline-none min-h-[200px] prose prose-sm max-w-none",
        },
        handleKeyDown: (view, event) => {
          // Handle tag suggestions navigation
          if (showTagSuggestions && filteredTags.length > 0) {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setSelectedTagIndex((prev) => (prev + 1) % filteredTags.length);
              return true;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setSelectedTagIndex((prev) => (prev - 1 + filteredTags.length) % filteredTags.length);
              return true;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault();
              handleSelectTag(filteredTags[selectedTagIndex]);
              return true;
            }
            if (event.key === "Escape") {
              setShowTagSuggestions(false);
              return true;
            }
          }

          const { state } = view;
          const { selection } = state;
          const { $from, empty } = selection;
          
          // Handle Backspace on empty list items
          if (event.key === "Backspace" && empty) {
            const parent = $from.parent;
            const grandparent = $from.node(-1);
            
            // Check if we're in a list item
            if (grandparent?.type.name === "listItem") {
              // If the paragraph is empty and we're at the start
              if (parent.textContent === "" && $from.parentOffset === 0) {
                // This will lift the list item out of the list
                return false; // Let TipTap handle it
              }
            }
            
            // Check if we're directly in a list item (not in a nested paragraph)
            if (parent.type.name === "listItem" && parent.textContent === "") {
              return false; // Let TipTap handle it
            }
          }
          
          return false;
        },
        handleClick: (view, pos, event) => {
          // Check if clicked on a tag
          const target = event.target as HTMLElement;
          if (target.classList.contains("tag-link") || target.closest(".tag-link")) {
            const tagElement = target.classList.contains("tag-link") ? target : target.closest(".tag-link");
            const tag = tagElement?.getAttribute("data-tag");
            if (tag && onTagClick) {
              event.preventDefault();
              onTagClick(tag);
              return true;
            }
          }
          return false;
        },
        handlePaste: (view, event) => {
          // Handle image paste
          const items = event.clipboardData?.items;
          if (!items) return false;

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (item.type.startsWith("image/")) {
              event.preventDefault();
              const file = item.getAsFile();
              if (file && onImageUpload) {
                onImageUpload(file).then((url) => {
                  if (url && editor) {
                    editor.chain().focus().setImage({ src: url }).run();
                  }
                });
              }
              return true;
            }
          }
          return false;
        },
      },
    });

    // Expose editor methods via ref
    useImperativeHandle(ref, () => ({
      editor,
      insertImage: (url: string, alt?: string) => {
        if (editor) {
          editor.chain().focus().setImage({ src: url, alt }).run();
        }
      },
      focus: () => {
        if (editor) {
          editor.commands.focus();
        }
      },
      insertTag: (tag: string) => {
        if (editor) {
          editor.chain().focus().insertContent(`#${tag} `).run();
        }
      },
    }));

    // Update content when prop changes (only if different)
    useEffect(() => {
      if (editor) {
        const currentMarkdown = convertHtmlToMarkdown(editor.getHTML());
        if (content !== currentMarkdown) {
          const html = convertMarkdownToHtml(content);
          editor.commands.setContent(html, { emitUpdate: false });
        }
      }
    }, [content, editor]);

    // Update editable state
    useEffect(() => {
      if (editor) {
        editor.setEditable(editable);
      }
    }, [editable, editor]);

    // Close suggestions when clicking outside
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setShowTagSuggestions(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div ref={containerRef} className={`wysiwyg-editor relative ${className}`}>
        <EditorContent editor={editor} />
        {showTagSuggestions && (
          <TagSuggestions
            tags={filteredTags}
            selectedIndex={selectedTagIndex}
            onSelect={handleSelectTag}
            position={suggestionPosition}
          />
        )}
      </div>
    );
  }
);

WysiwygEditor.displayName = "WysiwygEditor";

// Improved Markdown to HTML converter
function convertMarkdownToHtml(markdown: string): string {
  if (!markdown || markdown.trim() === "") return "<p></p>";
  
  const lines = markdown.split("\n");
  const result: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCodeBlock = false;
  let codeContent: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Handle code blocks
    if (line.startsWith("```")) {
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeContent = [];
      } else {
        inCodeBlock = false;
        result.push(`<pre><code>${codeContent.join("\n")}</code></pre>`);
      }
      continue;
    }
    
    if (inCodeBlock) {
      codeContent.push(escapeHtml(line));
      continue;
    }
    
    // Close lists if needed
    const isUlLine = /^[-*]\s+/.test(line);
    const isOlLine = /^\d+\.\s+/.test(line);
    
    if (!isUlLine && inUl) {
      result.push("</ul>");
      inUl = false;
    }
    if (!isOlLine && inOl) {
      result.push("</ol>");
      inOl = false;
    }
    
    // Process inline elements
    line = processInlineElements(line);
    
    // Handle headers
    if (line.startsWith("### ")) {
      result.push(`<h3>${line.slice(4)}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      result.push(`<h2>${line.slice(3)}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      result.push(`<h1>${line.slice(2)}</h1>`);
      continue;
    }
    
    // Handle unordered lists
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      if (!inUl) {
        result.push("<ul>");
        inUl = true;
      }
      result.push(`<li><p>${ulMatch[1]}</p></li>`);
      continue;
    }
    
    // Handle ordered lists
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!inOl) {
        result.push("<ol>");
        inOl = true;
      }
      result.push(`<li><p>${olMatch[1]}</p></li>`);
      continue;
    }
    
    // Handle blockquotes
    if (line.startsWith("> ")) {
      result.push(`<blockquote><p>${line.slice(2)}</p></blockquote>`);
      continue;
    }
    
    // Handle horizontal rules
    if (/^[-*_]{3,}$/.test(line.trim())) {
      result.push("<hr>");
      continue;
    }
    
    // Handle images (already processed in inline elements, but check for standalone)
    if (line.includes("<img")) {
      result.push(line);
      continue;
    }
    
    // Handle empty lines
    if (line.trim() === "") {
      continue;
    }
    
    // Regular paragraph
    result.push(`<p>${line}</p>`);
  }
  
  // Close any open lists
  if (inUl) result.push("</ul>");
  if (inOl) result.push("</ol>");
  
  return result.join("") || "<p></p>";
}

// Process inline markdown elements
function processInlineElements(text: string): string {
  // Images first
  text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  
  // Links
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Tags - convert #tag to clickable span
  text = text.replace(/#([^\s#]+)/g, '<span class="tag-link text-primary cursor-pointer hover:underline" data-tag="$1">#$1</span>');
  
  // Bold and italic combined
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");
  
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");
  
  // Italic
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/_(.+?)_/g, "<em>$1</em>");
  
  // Inline code
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");
  
  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, "<s>$1</s>");
  
  return text;
}

// Escape HTML special characters
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Improved HTML to Markdown converter
function convertHtmlToMarkdown(html: string): string {
  if (!html || html === "<p></p>") return "";
  
  let markdown = html;
  
  // Convert tag links back to plain tags
  markdown = markdown.replace(/<span[^>]*class="tag-link[^"]*"[^>]*data-tag="([^"]*)"[^>]*>#[^<]*<\/span>/gi, "#$1");
  
  // Convert images
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  markdown = markdown.replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, "![$1]($2)");
  markdown = markdown.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)");
  
  // Convert links
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "[$2]($1)");
  
  // Convert headers
  markdown = markdown.replace(/<h1[^>]*>(.+?)<\/h1>/gi, "# $1\n");
  markdown = markdown.replace(/<h2[^>]*>(.+?)<\/h2>/gi, "## $1\n");
  markdown = markdown.replace(/<h3[^>]*>(.+?)<\/h3>/gi, "### $1\n");
  
  // Convert bold and italic
  markdown = markdown.replace(/<strong><em>(.+?)<\/em><\/strong>/gi, "***$1***");
  markdown = markdown.replace(/<em><strong>(.+?)<\/strong><\/em>/gi, "***$1***");
  markdown = markdown.replace(/<strong[^>]*>(.+?)<\/strong>/gi, "**$1**");
  markdown = markdown.replace(/<em[^>]*>(.+?)<\/em>/gi, "*$1*");
  
  // Convert strikethrough
  markdown = markdown.replace(/<s[^>]*>(.+?)<\/s>/gi, "~~$1~~");
  
  // Convert inline code
  markdown = markdown.replace(/<code[^>]*>(.+?)<\/code>/gi, "`$1`");
  
  // Convert code blocks
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>([\s\S]+?)<\/code><\/pre>/gi, "```\n$1\n```\n");
  
  // Convert blockquotes
  markdown = markdown.replace(/<blockquote[^>]*><p[^>]*>(.+?)<\/p><\/blockquote>/gi, "> $1\n");
  markdown = markdown.replace(/<blockquote[^>]*>(.+?)<\/blockquote>/gi, "> $1\n");
  
  // Convert horizontal rules
  markdown = markdown.replace(/<hr[^>]*\/?>/gi, "---\n");
  
  // Convert lists - handle nested paragraphs in list items
  markdown = markdown.replace(/<ul[^>]*>/gi, "");
  markdown = markdown.replace(/<\/ul>/gi, "");
  markdown = markdown.replace(/<ol[^>]*>/gi, "");
  markdown = markdown.replace(/<\/ol>/gi, "");
  markdown = markdown.replace(/<li[^>]*><p[^>]*>(.+?)<\/p><\/li>/gi, "- $1\n");
  markdown = markdown.replace(/<li[^>]*>(.+?)<\/li>/gi, "- $1\n");
  
  // Convert paragraphs
  markdown = markdown.replace(/<p[^>]*>(.+?)<\/p>/gi, "$1\n");
  markdown = markdown.replace(/<br\s*\/?>/gi, "\n");
  
  // Clean up
  markdown = markdown.replace(/\n{3,}/g, "\n\n");
  markdown = markdown.trim();
  
  return markdown;
}

export default WysiwygEditor;
