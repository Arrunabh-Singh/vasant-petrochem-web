"use client";

import { useActionState, useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { requestTds, type TdsGateState } from "../actions/tds";

const initialState: TdsGateState = { status: "idle" };

/** Sits inside the dark "Technical data sheet" card, so it is styled for that ground. */
const TdsGate = ({ productId, productLabel }: { productId: string; productLabel: string }) => {
    const boundAction = requestTds.bind(null, productId, productLabel);
    const [state, formAction, pending] = useActionState(boundAction, initialState);
    const openedUrlRef = useRef<string | null>(null);

    useEffect(() => {
        if (state.status === "success" && state.url && openedUrlRef.current !== state.url) {
            window.open(state.url, "_blank", "noopener,noreferrer");
            openedUrlRef.current = state.url;
        }
    }, [state]);

    if (state.status === "success" && state.url) {
        return (
            <div className="text-sm">
                <p className="font-bold text-brand-accent mb-1">Your download opened in a new tab.</p>
                <a href={state.url} target="_blank" rel="noopener noreferrer" className="text-xs text-slate-300 underline">
                    Didn&apos;t open? Click here.
                </a>
            </div>
        );
    }

    return (
        <form action={formAction} className="flex flex-col gap-2.5">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <label htmlFor="tds-email" className="field-label">Email for instant TDS/SDS download</label>
            <input
                id="tds-email"
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@company.com"
                className="field-input"
            />
            <button type="submit" disabled={pending} className="btn-accent w-full">
                {pending ? <Loader2 size={18} className="animate-spin" /> : "REQUEST THE TDS"}
            </button>
            {state.status === "error" && <p className="text-[13px] text-amber-300">{state.message}</p>}
        </form>
    );
};

export default TdsGate;
