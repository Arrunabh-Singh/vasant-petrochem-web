"use client";

import { useActionState, useEffect, useRef } from "react";
import { FileText, Loader2 } from "lucide-react";
import { requestTds, type TdsGateState } from "../actions/tds";

const initialState: TdsGateState = { status: "idle" };

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
                <p className="text-brand-accent font-bold mb-1">Your download opened in a new tab.</p>
                <a href={state.url} target="_blank" rel="noopener noreferrer" className="text-brand underline text-xs">
                    Didn&apos;t open? Click here.
                </a>
            </div>
        );
    }

    return (
        <form action={formAction} className="space-y-2">
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
            <label htmlFor="tds-email" className="text-xs font-bold text-brand-dark uppercase tracking-widest block">
                Email for instant TDS/SDS download
            </label>
            <div className="flex gap-2">
                <input
                    id="tds-email" type="email" name="email" required placeholder="you@company.com"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-brand outline-none min-w-0"
                />
                <button type="submit" disabled={pending} className="btn-primary px-4 py-2.5 text-xs shrink-0 disabled:opacity-60">
                    {pending ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                </button>
            </div>
            {state.status === "error" && <p className="text-amber-600 text-xs">{state.message}</p>}
        </form>
    );
};

export default TdsGate;
