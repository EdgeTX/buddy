import environment from "shared/environment";
import React, { useEffect } from "react";
import { pageview, initialize, ga } from "react-ga";
import { useLocation } from "react-router-dom";

export const setupTracking = (): void => {
  initialize("UA-219544404-1", {
    gaOptions: {
      storage: "none",
    },
  });
  ga("set", "dimension1", environment.isElectron ? "electron" : "web");

  // Disable file protocol checking when running in electron
  if (environment.isElectron) {
    ga("set", "checkProtocolTask", null);
  }
};

export const RouteTracker: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    pageview(`${location.pathname}${location.search}`);
  }, [location]);

  return null;
};
