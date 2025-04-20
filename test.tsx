import React from "react";
import { useNavigate } from "react-router-dom";
import FroalaEditor from "react-froala-wysiwyg";
import "froala-editor/css/froala_editor.pkgd.min.css";
import useAuthStore from "../../stores/authStore";
import useContentStore from "../../stores/contentStore";
import styles from "./MainPage.module.css";

const MainPage: React.FC = () => {
  const { username } = useAuthStore();
  const { content, setContent } = useContentStore();
  const navigate = useNavigate();

  return (
    <div className={styles.mainContainer}>
      <header className={styles.header}>
        <button onClick={() => navigate("/")} className={styles.backButton}>
          Back
        </button>
        <h1>Welcome to MyDiary, {username}!</h1>
      </header>
      <main className={styles.gridContainer}>
        <section className={styles.editorColumn}>
          <FroalaEditor
            tag="textarea"
            model={content}
            onModelChange={(model: string) => setContent(model)}
            config={{
              toolbarButtons: [
                "bold",
                "italic",
                "underline",
                "strikeThrough",
                "subscript",
                "superscript",
                "fontFamily",
                "fontSize",
                "textColor",
                "backgroundColor",
                "inlineClass",
                "inlineStyle",
                "paragraphFormat",
                "paragraphStyle",
                "align",
                "formatOL",
                "formatUL",
                "outdent",
                "indent",
                "quote",
                "insertLink",
                "insertImage",
                "insertVideo",
                "insertTable",
                "emoticons",
                "specialCharacters",
                "insertHR",
                "selectAll",
                "clearFormatting",
                "print",
                "help",
                "html",
                "undo",
                "redo",
                "fullscreen",
                "spellChecker",
                "insertFile",
              ],
              placeholderText: "Start writing your blog...",
              pluginsEnabled: ["align", "charCounter", "codeView", "emoticons"],
            }}
          />
        </section>
        <section className={styles.sidebarColumn}>
          <h3>Past Posts</h3>
          <ul>
            {/* Dummy past posts */}
            <li>My First Blog</li>
            <li>A Day in React</li>
          </ul>
        </section>
      </main>
      <footer className={styles.footer}>
        <span>MyDiary © 2025</span>
        <button
          onClick={() => navigate("/preview")}
          className={styles.previewButton}
        >
          Preview
        </button>
      </footer>
    </div>
  );
};

export default MainPage;
