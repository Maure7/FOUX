import { useState } from 'react';

// Sidebar values come from computed styles, which refresh once per frame.
// A controlled input must not snap back in between (a color picker would jump
// under the cursor), so it shows the user's value until the source catches up.
export default function useDraft(value) {
  const [draft, setDraft] = useState(null);
  const [source, setSource] = useState(value);
  if (!Object.is(source, value)) {
    setSource(value);
    setDraft(null);
  }
  return [draft ?? value, setDraft];
}
