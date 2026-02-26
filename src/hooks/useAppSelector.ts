import { useSelector } from "react-redux";

import type { RootState } from "@/app/rootReducer";

export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector);
