import { THEME_IDS } from "../domain/constants";
import { topicueThemes } from "../domain/theme";

import type { ThemeId } from "../domain/config-schema";
import type { CSSProperties } from "react";

interface ThemePickerProps {
  selectedThemeId: ThemeId;
  onChange: (themeId: ThemeId) => void;
}

interface ThemeCardStyle extends CSSProperties {
  "--theme-card-accent": string;
}

export const ThemePicker = ({ selectedThemeId, onChange }: ThemePickerProps) => (
  <div className="theme-picker" role="radiogroup" aria-label="テーマ">
    {THEME_IDS.map((themeId) => {
      const theme = topicueThemes[themeId];
      const selected = themeId === selectedThemeId;
      const style: ThemeCardStyle = { "--theme-card-accent": theme.studio.accent };
      return (
        <button
          type="button"
          className="theme-card"
          role="radio"
          aria-checked={selected}
          data-theme-id={themeId}
          key={themeId}
          style={style}
          onClick={() => onChange(themeId)}
        >
          <span className="theme-swatches" aria-hidden="true">
            {[
              theme.dice.bodyHighlight,
              theme.dice.body,
              theme.dice.rim,
              theme.resultCard.background,
            ].map((color, index) => (
              <span key={`${themeId}:${index}`} style={{ backgroundColor: color }} />
            ))}
          </span>
          <span className="theme-card-copy">
            <strong>{theme.name}</strong>
            <small>{theme.description}</small>
          </span>
          <span className="theme-card-check" aria-hidden="true">
            {selected ? "✓" : ""}
          </span>
        </button>
      );
    })}
  </div>
);
