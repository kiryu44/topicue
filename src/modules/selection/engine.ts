import { SelectionError } from "./types";

import type {
  RandomSource,
  SelectionFace,
  SelectionInput,
  SelectionPrompt,
  SelectionResult,
  SessionSelectionState,
} from "./types";

interface Candidate {
  face: SelectionFace;
  prompt: SelectionPrompt;
}

const shuffle = <T>(values: readonly T[], random: RandomSource): T[] => {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = random.nextInt(index + 1);
    const value = result[index];
    result[index] = result[other] as T;
    result[other] = value as T;
  }
  return result;
};

const cloneState = (state: SessionSelectionState): SessionSelectionState => {
  return {
    lastPromptId: state.lastPromptId,
    usedPromptIds: [...state.usedPromptIds],
    globalShuffleBag: [...state.globalShuffleBag],
    perFaceShuffleBags: Object.fromEntries(
      Object.entries(state.perFaceShuffleBags).map(([faceId, ids]) => [faceId, [...ids]]),
    ),
  };
};

const enabledCandidates = (input: SelectionInput): Candidate[] => {
  return input.config.faces.flatMap((face) =>
    face.enabled
      ? face.prompts.filter((prompt) => prompt.enabled).map((prompt) => ({ face, prompt }))
      : [],
  );
};

const chooseByPolicy = (
  candidates: Candidate[],
  policy: "face_uniform" | "prompt_uniform",
  random: RandomSource,
): Candidate => {
  if (candidates.length === 0) throw new SelectionError("NO_ELIGIBLE_PROMPTS");
  if (policy === "prompt_uniform")
    return candidates[random.nextInt(candidates.length)] as Candidate;
  const faceIds = [...new Set(candidates.map(({ face }) => face.id))];
  const faceId = faceIds[random.nextInt(faceIds.length)] as string;
  const faceCandidates = candidates.filter(({ face }) => face.id === faceId);
  return faceCandidates[random.nextInt(faceCandidates.length)] as Candidate;
};

const result = (
  candidate: Candidate,
  state: SessionSelectionState,
  all: Candidate[],
): SelectionResult => {
  state.lastPromptId = candidate.prompt.id;
  if (!state.usedPromptIds.includes(candidate.prompt.id))
    state.usedPromptIds.push(candidate.prompt.id);
  return {
    faceId: candidate.face.id,
    promptId: candidate.prompt.id,
    nextState: state,
    diagnostics: {
      eligibleFaceCount: new Set(all.map(({ face }) => face.id)).size,
      eligiblePromptCount: all.length,
    },
  };
};

const fromBag = (
  input: SelectionInput,
  all: Candidate[],
  state: SessionSelectionState,
): SelectionResult => {
  const candidateByPrompt = new Map(all.map((candidate) => [candidate.prompt.id, candidate]));
  if (input.config.selection.policy === "prompt_uniform") {
    state.globalShuffleBag = state.globalShuffleBag.filter((id) => candidateByPrompt.has(id));
    if (state.globalShuffleBag.length === 0) {
      const exhausted = all.every(({ prompt }) => input.state.usedPromptIds.includes(prompt.id));
      if (exhausted && !input.config.selection.resetWhenExhausted) {
        throw new SelectionError("PROMPTS_EXHAUSTED");
      }
      state.globalShuffleBag = shuffle([...candidateByPrompt.keys()], input.random);
    }
    const promptId = state.globalShuffleBag.pop();
    if (promptId === undefined) throw new SelectionError("NO_ELIGIBLE_PROMPTS");
    return result(candidateByPrompt.get(promptId) as Candidate, state, all);
  }

  const faceIds = [...new Set(all.map(({ face }) => face.id))];
  for (const faceId of faceIds) {
    const validIds = new Set(
      all.filter(({ face }) => face.id === faceId).map(({ prompt }) => prompt.id),
    );
    state.perFaceShuffleBags[faceId] = (state.perFaceShuffleBags[faceId] ?? []).filter((id) =>
      validIds.has(id),
    );
  }
  let availableFaces = faceIds.filter(
    (faceId) => (state.perFaceShuffleBags[faceId]?.length ?? 0) > 0,
  );
  if (availableFaces.length === 0) {
    const exhausted = all.every(({ prompt }) => input.state.usedPromptIds.includes(prompt.id));
    if (exhausted && !input.config.selection.resetWhenExhausted)
      throw new SelectionError("PROMPTS_EXHAUSTED");
    for (const faceId of faceIds) {
      state.perFaceShuffleBags[faceId] = shuffle(
        all.filter(({ face }) => face.id === faceId).map(({ prompt }) => prompt.id),
        input.random,
      );
    }
    availableFaces = faceIds;
  }
  const faceId = availableFaces[input.random.nextInt(availableFaces.length)] as string;
  const promptId = state.perFaceShuffleBags[faceId]?.pop();
  if (promptId === undefined) throw new SelectionError("NO_ELIGIBLE_PROMPTS");
  return result(candidateByPrompt.get(promptId) as Candidate, state, all);
};

export const selectPrompt = (input: SelectionInput): SelectionResult => {
  const all = enabledCandidates(input);
  if (all.length === 0) throw new SelectionError("NO_ELIGIBLE_PROMPTS");
  const state = cloneState(input.state);
  const { mode, policy } = input.config.selection;

  if (mode === "shuffle_bag") return fromBag(input, all, state);

  let eligible = all;
  if (mode === "no_immediate_repeat" && all.length > 1 && state.lastPromptId !== null) {
    eligible = all.filter(({ prompt }) => prompt.id !== state.lastPromptId);
  }
  if (mode === "elimination") {
    const used = new Set(state.usedPromptIds);
    eligible = all.filter(({ prompt }) => !used.has(prompt.id));
    if (eligible.length === 0) throw new SelectionError("PROMPTS_EXHAUSTED");
  }
  return result(chooseByPolicy(eligible, policy, input.random), state, eligible);
};
