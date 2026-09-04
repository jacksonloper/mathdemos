import type { ComponentType } from "react";
import { Binning } from "./Binning";

export type CaseStudy = {
  id: string;
  title: string;
  module: string;
  Component: ComponentType;
};

/** Add a case study by writing its component and appending it here. */
export const caseStudies: CaseStudy[] = [
  { id: "binning", title: "Class width", module: "Module 2", Component: Binning },
];
