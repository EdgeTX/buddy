import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import SelectFirmware from "./steps/SelectFirmware";

const FlashingWizard: React.FC = () => {
  const [stage, setStage] = useState<"firmware" | "flash">();
  const [params, setParams] = useSearchParams();
  const version = params.get("version");
  const target = params.get("target");

  useEffect(() => {
    if (!version || !target) {
      setStage("firmware");
    }
  }, [stage, version, target]);

  return (
    <>
      {stage === "firmware" && (
        <SelectFirmware
          onTargetSelected={(newTarget) =>
            setParams(
              { ...(version ? { version } : {}), target: newTarget },
              { replace: true }
            )
          }
          onVersionSelected={(newVersion) =>
            setParams(
              { ...(target ? { target } : {}), version: newVersion },
              { replace: true }
            )
          }
        />
      )}
    </>
  );
};

export default FlashingWizard;
