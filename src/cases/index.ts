import type { ComponentType } from "react";
import { Binning } from "./Binning";

export type CaseStudy = {
  id: string;
  title: string;
  /** Where this demo is used. Courses live on the demo, not on the app. */
  course?: string;
  topic: string;
  Component: ComponentType;
};

/** Add a demo by writing its component and appending it here. */
export const caseStudies: CaseStudy[] = [
  {
    id: "binning",
    title: "Class width",
    course: "MTH 160X",
    topic: "Histograms",
    Component: Binning,
  },
];
