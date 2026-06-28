"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";
import { toast } from "sonner";
import type { PlainFixedExpense } from "@/db/repositories/fixed";
import type { ActionResult } from "../actions";

type Snapshot = PlainFixedExpense[];

type Opts<TVars, TData> = {
  mutationFn: (vars: TVars) => Promise<ActionResult<TData>>;
  busyId: (vars: TVars) => string;
  patch: (vars: TVars, current: PlainFixedExpense) => PlainFixedExpense;
  successMessage: string;
  errorMessage: string;
};

/**
 * Centralizes the optimistic-update + invalidate flow shared by
 * markPaid / unmarkPaid / skipCycle / unskipCycle on /fixed.
 *
 * Always invalidates: ["fixed"], ["auto-debit"], ["fixed-payments"],
 * ["payments"], ["dashboard"]. Callers don't need to specify them.
 */
export function useFixedOptimisticMutation<TVars, TData>(
  opts: Opts<TVars, TData>,
  setBusyId: (id: string | null) => void,
): UseMutationResult<
  ActionResult<TData>,
  Error,
  TVars,
  { snapshot: Snapshot | undefined }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: opts.mutationFn,
    onMutate: async (vars) => {
      const id = opts.busyId(vars);
      setBusyId(id);
      await queryClient.cancelQueries({ queryKey: ["fixed"] });
      const previous = queryClient.getQueryData<Snapshot>(["fixed"]);
      if (previous) {
        queryClient.setQueryData<Snapshot>(
          ["fixed"],
          previous.map((f) => (f.id === id ? opts.patch(vars, f) : f)),
        );
      }
      return { snapshot: previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.snapshot) {
        queryClient.setQueryData<Snapshot>(["fixed"], ctx.snapshot);
      }
      toast.error(opts.errorMessage);
    },
    onSettled: async () => {
      setBusyId(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["fixed"] }),
        queryClient.invalidateQueries({ queryKey: ["auto-debit"] }),
        queryClient.invalidateQueries({ queryKey: ["fixed-payments"] }),
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    },
    onSuccess: (res) => {
      if (!res.ok) {
        toast.error(res.error.message);
        return;
      }
      toast.success(opts.successMessage);
    },
  });
}
