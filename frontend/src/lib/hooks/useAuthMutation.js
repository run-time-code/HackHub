import { useState } from "react";

export function useAuthMutation(mutationFn) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  async function mutate(payload) {
    setIsLoading(true);
    setError(null);
    try {
      return await mutationFn(payload);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  return { mutate, isLoading, error };
}