import { gql, useQuery } from "@apollo/client";
import React, { useEffect } from "react";
import { decodePrVersion, encodePrVersion } from "shared/tools";
import PrTargetForm from "./PrTargetForm";

type Props = {
  onChanged: (values: { target?: string; version?: string }) => void;
  target?: string;
  version?: string;
};

const FirmwarePrBuildPicker: React.FC<Props> = ({
  onChanged,
  target,
  version,
}) => {
  // version string should be in the format `pr-${prId}@${commit}`
  const { prId, commitId } = decodePrVersion(version ?? "");

  const prsQuery = useQuery(
    gql(/* GraphQL */ `
      query EdgeTxPrs {
        edgeTxPrs {
          id
          name
          headCommitId
        }
      }
    `)
  );

  const prs = prsQuery.data?.edgeTxPrs;
  const validPr = !!prs?.find((pr) => pr.id === prId);

  useEffect(() => {
    if (prId && !prsQuery.loading && !validPr) {
      onChanged({
        version: undefined,
        target: undefined,
      });
    }
  }, [prId, validPr, prsQuery.loading, onChanged]);

  const commitsQuery = useQuery(
    gql(/* GraphQL */ `
      query EdgeTxPrCommits($prId: ID!) {
        edgeTxPr(id: $prId) {
          id
          commits {
            id
          }
        }
      }
    `),
    {
      skip: !validPr,
      variables: {
        prId: prId ?? "",
      },
    }
  );

  const prCommits = commitsQuery.data?.edgeTxPr?.commits;
  const validPrCommit = !!prCommits?.find((commit) => commit.id === commitId);

  useEffect(() => {
    if (
      prId &&
      !prsQuery.loading &&
      validPr &&
      !commitsQuery.loading &&
      !validPrCommit &&
      commitId
    ) {
      onChanged({
        version: `pr-${prId}`,
        target: undefined,
      });
    }
  }, [
    prId,
    validPr,
    prsQuery.loading,
    commitsQuery.loading,
    validPrCommit,
    commitId,
    onChanged,
  ]);

  const commitBuildQuery = useQuery(
    gql(/* GraphQL */ `
      query EdgeTxPrCommitBuild($prId: ID!, $commitId: ID!) {
        edgeTxPr(id: $prId) {
          id
          commit(id: $commitId) {
            id
            firmwareBundle {
              id
              targets {
                id
                name
              }
            }
          }
        }
      }
    `),
    {
      skip: !validPr || !validPrCommit,
      variables: {
        prId: prId ?? "",
        commitId: commitId ?? "",
      },
    }
  );

  const commitBuildTargets =
    commitBuildQuery.data?.edgeTxPr?.commit?.firmwareBundle?.targets;
  const validTarget = !!commitBuildTargets?.find((t) => t.id === target);

  useEffect(() => {
    if (
      prId &&
      !prsQuery.loading &&
      validPr &&
      !commitsQuery.loading &&
      validPrCommit &&
      commitId &&
      target &&
      !commitBuildQuery.loading &&
      !validTarget
    ) {
      onChanged({
        version: `pr-${prId}@${commitId}`,
        target: undefined,
      });
    }
  }, [
    prId,
    validPr,
    prsQuery.loading,
    commitsQuery.loading,
    validPrCommit,
    commitId,
    target,
    commitBuildQuery.loading,
    validTarget,
    onChanged,
  ]);

  return (
    <PrTargetForm
      targets={{
        available: commitBuildTargets ?? null,
        loading: commitBuildQuery.loading,
        error: !!commitBuildQuery.error,
        selectedId: target,
      }}
      pullRequests={{
        available: prs ?? null,
        loading: prsQuery.loading,
        error: !!prsQuery.error,
        selectedId: prId,
      }}
      commits={{
        available: prCommits ?? null,
        loading: commitsQuery.loading,
        error: !!commitsQuery.error,
        selectedId: commitId,
      }}
      onChanged={(newValues) => {
        onChanged({
          target: newValues.target,
          version: encodePrVersion({
            prId: newValues.pullRequest,
            commitId: newValues.commit,
          }),
        });
      }}
    />
  );
};

export default FirmwarePrBuildPicker;
