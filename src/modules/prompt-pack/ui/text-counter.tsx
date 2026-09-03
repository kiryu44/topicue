import { graphemeCount } from "../domain/text";

interface TextCounterProps {
  value: string;
  maximum: number;
}

export const TextCounter = ({ value, maximum }: TextCounterProps) => (
  <span className="field-help" aria-live="polite">
    {graphemeCount(value)} / {maximum}文字
  </span>
);
