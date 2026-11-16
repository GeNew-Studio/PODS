"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CHANGE_EVENT } from "@/lib/db";

// Loads data from browser storage after the page mounts and reloads it whenever the
// local data changes. Returns undefined while loading.
export function useData<T>(key: string, load: () => Promise<T>): T | undefined {
  const [state, setState] = useState<{ key: string; data: T } | null>(null);
  const loadRef = useRef(load);

  useEffect(() => {
    loadRef.current = load;
  });

  useEffect(() => {
    let active = true;
    const run = () => {
      loadRef.current().then((data) => {
        if (active) setState({ key, data });
      });
    };
    run();
    window.addEventListener(CHANGE_EVENT, run);
    return () => {
      active = false;
      window.removeEventListener(CHANGE_EVENT, run);
    };
  }, [key]);

  return state?.key === key ? state.data : undefined;
}

// Wraps an action that returns the next page so it can be used as a form action.
export function useNavigateAction(action: (formData: FormData) => Promise<string>) {
  const router = useRouter();
  return async (formData: FormData) => {
    router.push(await action(formData));
  };
}
