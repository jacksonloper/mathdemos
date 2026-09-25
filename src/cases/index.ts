import type { ComponentType } from "react";
import { Balance } from "./Balance";
import { Binning } from "./Binning";
import { Bivariate } from "./Bivariate";

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
    topic: "Histograms",
    Component: Binning,
  },
  {
    id: "balance",
    title: "Mean and median",
    topic: "Averages",
    Component: Balance,
  },
  {
    id: "bivariate",
    title: "Line of best fit",
    topic: "Regression",
    Component: Bivariate,
  },
];
