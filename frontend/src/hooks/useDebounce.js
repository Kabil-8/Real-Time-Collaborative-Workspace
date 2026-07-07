import { useState, useEffect } from "react";

/**
 * useDebounce — delays updating a value until after a specified delay.
 * Useful for search inputs, API calls, etc.
 *
 * @param {any}    value  - The value to debounce
 * @param {number} delay  - Delay in milliseconds (default: 350)
 * @returns {any}         - Debounced value
 *
 * @example
 * const debouncedQuery = useDebounce(query, 400);
 * useEffect(() => { if (debouncedQuery) doSearch(debouncedQuery); }, [debouncedQuery]);
 */
const useDebounce = (value, delay = 350) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;
