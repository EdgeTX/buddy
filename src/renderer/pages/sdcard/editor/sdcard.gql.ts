// renderer/pages/sdcard/editor/sdcard.gql.ts

import { gql, TypedDocumentNode } from "@apollo/client";

// --- SD_CARD_ASSET_INFO ---
export type SdcardAssetInfoData = {
  sdcardDirectory: {
    id: string;
    name: string;
    pack: { target: string; version: string };
    sounds: { ids: string[]; version: string };
  } | null;
};
export type SdcardAssetInfoVars = { directoryId: string };

export const SD_CARD_ASSET_INFO = gql`
  query SdcardAssetInfo($directoryId: ID!) {
    sdcardDirectory(id: $directoryId) {
      id
      name
      pack {
        target
        version
      }
      sounds {
        ids
        version
      }
    }
  }
` as TypedDocumentNode<SdcardAssetInfoData, SdcardAssetInfoVars>;

// --- SD_CARD_PACKS ---
export type SdcardPacksData = {
  edgeTxSdcardPackReleases: {
    id: string;
    name: string;
    isPrerelease: boolean;
    targets: { id: string; name: string }[];
  }[];
};
export type SdcardPacksVars = unknown;

export const SD_CARD_PACKS = gql`
  query SdcardPacks {
    edgeTxSdcardPackReleases {
      id
      name
      isPrerelease
      targets {
        id
        name
      }
    }
  }
` as TypedDocumentNode<SdcardPacksData, SdcardPacksVars>;

// --- SD_CARD_SOUNDS_FOR_PACK ---
export type SdcardSoundsForPackData = {
  edgeTxSoundsRelease: {
    id: string;
    name: string;
    sounds: string[];
  } | null;
};
export type SdcardSoundsForPackVars = {
  packId?: string;
  soundsVersion?: string;
  isPrerelease: boolean;
};

export const SD_CARD_SOUNDS_FOR_PACK = gql`
  query SdcardSoundsForPack(
    $packId: ID
    $soundsVersion: ID
    $isPrerelease: Boolean!
  ) {
    edgeTxSoundsRelease(
      forPack: $packId
      id: $soundsVersion
      isPrerelease: $isPrerelease
    ) {
      id
      name
      sounds
    }
  }
` as TypedDocumentNode<SdcardSoundsForPackData, SdcardSoundsForPackVars>;

// --- CREATE_SDCARD_WRITE_JOB ---
export type CreateSdcardWriteJobData = {
  createSdcardWriteJob: { id: string };
};
export type CreateSdcardWriteJobVars = {
  directoryId: string;
  pack?: { version: string; target: string } | null;
  sounds?: { ids: string[]; version: string } | null;
  clean?: boolean;
};

export const CREATE_SDCARD_WRITE_JOB = gql`
  mutation CreateSdcardPackAndSoundsWriteJob(
    $directoryId: ID!
    $pack: SdcardPackInput
    $sounds: SdcardSoundsInput
    $clean: Boolean
  ) {
    createSdcardWriteJob(
      pack: $pack
      sounds: $sounds
      clean: $clean
      directoryId: $directoryId
    ) {
      id
    }
  }
` as TypedDocumentNode<CreateSdcardWriteJobData, CreateSdcardWriteJobVars>;

export const FULL_SDCARD_INFO = gql`
  query FullSdcardInfo($directoryId: ID!) {
    sdcardDirectory(id: $directoryId) {
      id
      isValid
      pack {
        target
        version
      }
    }
    sdcardAssetsDirectory(id: $directoryId) {
      id
      isValid
      models {
        name
        yaml
        parsed
        bitmapName
        bitmapDataUrl
      }
      themes
      radio {
        name
        yaml
        parsed
      }
    }
  }
` as TypedDocumentNode<
  {
    sdcardDirectory: {
      id: string;
      isValid: boolean;
      pack: { target: string; version: string };
    } | null;
    sdcardAssetsDirectory: {
      id: string;
      isValid: boolean;
      models: {
        name: string;
        yaml: string;
        parsed: unknown;
        bitmapName: string | null;
        bitmapDataUrl: string | null;
      }[];
      themes: string[];
      radio: { name: string; yaml: string; parsed: unknown }[];
    } | null;
  },
  { directoryId: string }
>;

export const SD_CARD_DIRECTORY_INFO = gql`
  query SdcardAssetsDirectoryInfo($directoryId: ID!) {
    sdcardAssetsDirectory(id: $directoryId) {
      id
      isValid
      models {
        name
        yaml
        parsed
        bitmapName
        bitmapDataUrl
      }
      themes
      radio {
        name
        yaml
        parsed
      }
    }
  }
` as TypedDocumentNode<
  SdcardAssetsDirectoryInfoData,
  SdcardAssetsDirectoryInfoVars
>;

export type SdcardAssetsDirectoryInfoData = {
  sdcardAssetsDirectory: {
    id: string;
    isValid: boolean;
    models: {
      name: string;
      yaml: string;
      parsed: unknown;
      bitmapName: string | null;
      bitmapDataUrl: string | null;
    }[];
    themes: string[];
    radio: {
      name: string;
      yaml: string;
      parsed: unknown;
    }[];
  } | null;
};

export type SdcardAssetsDirectoryInfoVars = {
  directoryId: string;
};

export const PICK_LOCAL_DIR = gql`
  mutation PickSdcardAssetsDirectory {
    pickSdcardAssetsDirectory {
      id
    }
  }
`;
export type PickSdcardDirectoryData = {
  pickSdcardAssetsDirectory: { id: string };
};
export type PickSdcardDirectoryVars = Record<string, never>;

export const CREATE_BACKUP_JOB = gql`
  mutation CreateBackupJob(
    $directoryId: ID!
    $models: SdcardModelsInput
    $themes: SdcardThemesInput
    $direction: BackupDirection!
  ) {
    createSdcardBackupJob(
      directoryId: $directoryId
      models: $models
      themes: $themes
      direction: $direction
    ) {
      id
    }
  }
` as TypedDocumentNode<CreateBackupJobData, CreateBackupJobVars>;

export type CreateBackupJobData = {
  createSdcardBackupJob: { id: string };
};
export type CreateBackupJobVars = {
  directoryId: string;
  models?: { ids: string[] };
  themes?: { ids: string[] };
  direction: "TO_LOCAL" | "TO_SDCARD";
};

export const BACKUP_JOB_UPDATES = gql`
  subscription BackupJobUpdates($jobId: ID!) {
    sdcardWriteJobUpdates(jobId: $jobId) {
      id
      cancelled
      stages {
        write {
          progress
          error
          writes {
            name
            startTime
            completedTime
          }
        }
      }
    }
  }
` as TypedDocumentNode<BackupJobUpdatesData, BackupJobUpdatesVars>;

export type BackupJobUpdatesData = {
  sdcardWriteJobUpdates: {
    id: string;
    cancelled: boolean;
    stages: {
      write: {
        progress: number;
        error: string | null;
        writes: {
          name: string;
          startTime: string;
          completedTime: string | null;
        }[];
      };
    };
  };
};

export type BackupJobUpdatesVars = {
  jobId: string;
};

export const GENERATE_BACKUP_PLAN = gql`
  mutation GenerateBackupPlan(
    $directoryId: ID!
    $paths: SdcardPathsInput!
    $direction: BackupDirection!
  ) {
    generateBackupPlan(
      directoryId: $directoryId
      paths: $paths
      direction: $direction
    ) {
      toCopy
      identical
      conflicts {
        path
        existingSize
        incomingSize
      }
    }
  }
` as TypedDocumentNode<GenerateBackupPlanData, GenerateBackupPlanVars>;
export type GenerateBackupPlanData = {
  generateBackupPlan: {
    toCopy: string[];
    identical: string[];
    conflicts: {
      path: string;
      existingSize: number;
      incomingSize: number;
    }[];
  };
};
export type GenerateBackupPlanVars = {
  directoryId: string;
  paths: { paths: string[] };
  direction: "TO_LOCAL" | "TO_SDCARD";
};

export const EXECUTE_BACKUP = gql`
  mutation ExecuteBackup(
    $directoryId: ID!
    $paths: SdcardPathsInput!
    $direction: BackupDirection!
    $conflictResolutions: ConflictResolutionsInput!
  ) {
    executeBackup(
      directoryId: $directoryId
      paths: $paths
      direction: $direction
      conflictResolutions: $conflictResolutions
    ) {
      id
    }
  }
` as TypedDocumentNode<ExecuteBackupData, ExecuteBackupVars>;
export type ExecuteBackupData = {
  executeBackup: {
    id: string;
  };
};
export type ExecuteBackupVars = {
  directoryId: string;
  paths: { paths: string[] };
  direction: "TO_LOCAL" | "TO_SDCARD";
  conflictResolutions: {
    items: { path: string; action: "OVERWRITE" | "SKIP" | "RENAME" }[];
  };
};

export const EXPORT_BACKUP_TO_ZIP = gql`
  mutation ExportBackupToZip($directoryId: ID!, $paths: SdcardPathsInput!) {
    exportBackupToZip(directoryId: $directoryId, paths: $paths)
  }
` as TypedDocumentNode<ExportBackupToZipData, ExportBackupToZipVars>;

export type ExportBackupToZipData = {
  exportBackupToZip: string;
};

export type ExportBackupToZipVars = {
  directoryId: string;
  paths: { paths: string[] };
};

// --- CREATE_SDCARD_RESTORE_JOB ---
export type CreateSdcardRestoreJobData = {
  createSdcardRestoreJob: { id: string };
};
export type CreateSdcardRestoreJobVars = {
  directoryId: string;
  zipData: string;
  options: {
    conflictResolutions: {
      items: { path: string; action: "OVERWRITE" | "SKIP" | "RENAME" }[];
    };
    overwrite?: boolean;
    autoRename?: boolean;
  };
};

export const CREATE_SDCARD_RESTORE_JOB = gql`
  mutation CreateSdcardRestoreJob(
    $directoryId: ID!
    $zipData: String!
    $options: RestoreOptionsInput!
  ) {
    createSdcardRestoreJob(
      directoryId: $directoryId
      zipData: $zipData
      options: $options
    ) {
      id
    }
  }
` as TypedDocumentNode<CreateSdcardRestoreJobData, CreateSdcardRestoreJobVars>;

export const GENERATE_RESTORE_PLAN = gql`
  mutation GenerateRestorePlan($directoryId: ID!, $zipData: String!) {
    generateRestorePlan(directoryId: $directoryId, zipData: $zipData) {
      toCopy
      identical
      conflicts {
        path
        existingSize
        incomingSize
      }
    }
  }
` as TypedDocumentNode<
  {
    generateRestorePlan: {
      toCopy: string[];
      identical: string[];
      conflicts: { path: string; existingSize: number; incomingSize: number }[];
    };
  },
  { directoryId: string; zipData: string }
>;

// Types for GenerateRestorePlan
export type CreateRestorePlanData = {
  generateRestorePlan: {
    toCopy: string[];
    identical: string[];
    conflicts: { path: string; existingSize: number; incomingSize: number }[];
  };
};
export type CreateRestorePlanVars = {
  directoryId: string;
  zipData: string;
};
