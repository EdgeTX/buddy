import { describe, expect, it, jest } from "@jest/globals";
import gql from "graphql-tag";
import { MockedFunction } from "jest-mock";
import nock from "nock";
import { createExecutor } from "test-utils/backend";

const requestWritableFolder = jest.fn() as MockedFunction<
  typeof window.showDirectoryPicker
>;

const backend = createExecutor({
  fileSystem: {
    requestWritableFolder,
  },
});

describe("Query", () => {
  describe("sdcardTargets", () => {
    // TODO: Query sdcard targets by release
    it("should return a list of sdcard targets for the latest firmware", async () => {
      const { nockDone } = await nock.back("sdcard-targets.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            sdcardTargets {
              id
              name
              tag
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.sdcardTargets).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "jumper-t16",
            "name": "Jumper T16",
            "tag": "latest",
          },
          Object {
            "id": "jumper-t18",
            "name": "Jumper T18",
            "tag": "latest",
          },
          Object {
            "id": "frsky-horus-x10",
            "name": "FrSky Horus X10",
            "tag": "latest",
          },
          Object {
            "id": "frsky-horus-x12s",
            "name": "FrSky Horus X12s",
            "tag": "latest",
          },
          Object {
            "id": "radiomaster-tx16s",
            "name": "Radiomaster TX16s",
            "tag": "latest",
          },
          Object {
            "id": "flysky-nirvana",
            "name": "FlySky Nirvana",
            "tag": "latest",
          },
          Object {
            "id": "jumper-t-lite",
            "name": "Jumper T-Lite",
            "tag": "latest",
          },
          Object {
            "id": "jumper-t12",
            "name": "Jumper T12",
            "tag": "latest",
          },
          Object {
            "id": "jumper-t8",
            "name": "Jumper T8",
            "tag": "latest",
          },
          Object {
            "id": "frsky-qx7",
            "name": "FrSky QX7",
            "tag": "latest",
          },
          Object {
            "id": "frsky-x-lite",
            "name": "FrSky X-Lite",
            "tag": "latest",
          },
          Object {
            "id": "frsky-x9-lite",
            "name": "FrSky X9 Lite",
            "tag": "latest",
          },
          Object {
            "id": "radiomaster-tx12",
            "name": "Radiomaster TX12",
            "tag": "latest",
          },
          Object {
            "id": "frsky-x9d",
            "name": "FrSky X9D",
            "tag": "latest",
          },
          Object {
            "id": "frsky-x9d-plus",
            "name": "FrSky X9D Plus",
            "tag": "latest",
          },
          Object {
            "id": "frsky-x9d-plus-2019",
            "name": "FrSky X9D Plus 2019",
            "tag": "latest",
          },
        ]
      `);

      nockDone();
    });
  });

  describe("sdcardSounds", () => {
    it("should return the available sdcard assets", async () => {
      const { nockDone } = await nock.back("sdcard-sounds.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            sdcardSounds {
              id
              name
              tag
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.sdcardSounds).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "cn",
            "name": "CN",
            "tag": "latest",
          },
          Object {
            "id": "cz",
            "name": "CZ",
            "tag": "latest",
          },
          Object {
            "id": "de",
            "name": "DE",
            "tag": "latest",
          },
          Object {
            "id": "en",
            "name": "EN",
            "tag": "latest",
          },
          Object {
            "id": "es",
            "name": "ES",
            "tag": "latest",
          },
          Object {
            "id": "fr",
            "name": "FR",
            "tag": "latest",
          },
          Object {
            "id": "it",
            "name": "IT",
            "tag": "latest",
          },
          Object {
            "id": "pt",
            "name": "PT",
            "tag": "latest",
          },
          Object {
            "id": "ru",
            "name": "RU",
            "tag": "latest",
          },
        ]
      `);

      nockDone();
    });
  });
});

describe("Mutation", () => {
  describe("pickSdcardFolder", () => {
    it("should return a file system handler requested by the user", async () => {
      requestWritableFolder.mockResolvedValue({
        name: "/some/folder/path",
      } as FileSystemDirectoryHandle);

      const { data, errors } = await backend.mutate({
        mutation: gql`
          mutation RequestFolder {
            pickSdcardFolder {
              id
              name
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.pickSdcardFolder).toEqual({
        id: expect.any(String),
        name: "/some/folder/path",
      });
    });

    it("should allow the folder info to be queried after being picked", async () => {
      requestWritableFolder.mockResolvedValue({
        name: "/some/other/folder",
      } as FileSystemDirectoryHandle);

      const requestFolderResponse = await backend.mutate({
        mutation: gql`
          mutation RequestFolder {
            pickSdcardFolder {
              id
              name
            }
          }
        `,
      });

      const { id } = requestFolderResponse.data?.pickSdcardFolder as {
        id: string;
      };

      const { data, errors } = await backend.query({
        query: gql`
          query FolderInfoQuery($id: ID!) {
            folderInfo(id: $id) {
              id
              name
            }
          }
        `,
        variables: {
          id,
        },
      });

      expect(errors).toBeFalsy();
      expect(data?.folderInfo).toEqual({
        id,
        name: "/some/other/folder",
      });
    });

    it("should only keep 5 folder handles", async () => {
      const currentHandles = await Promise.all(
        new Array(5).fill(1).map(async (_, i) => {
          requestWritableFolder.mockResolvedValueOnce({
            name: `/some/folder/folder${i}`,
          } as FileSystemDirectoryHandle);

          const requestFolderResponse = await backend.mutate({
            mutation: gql`
              mutation RequestFolder {
                pickSdcardFolder {
                  id
                  name
                }
              }
            `,
          });

          const { id } = requestFolderResponse.data?.pickSdcardFolder as {
            id: string;
          };

          return id;
        })
      );

      requestWritableFolder.mockResolvedValueOnce({
        name: `/some/folder/folderlast`,
      } as FileSystemDirectoryHandle);

      // Request one more so the first should be gone
      await backend.mutate({
        mutation: gql`
          mutation RequestFolder {
            pickSdcardFolder {
              id
              name
            }
          }
        `,
      });

      const { data, errors } = await backend.query({
        query: gql`
          query FolderInfoQuery($id: ID!) {
            folderInfo(id: $id) {
              id
              name
            }
          }
        `,
        variables: {
          id: currentHandles[0]!,
        },
      });

      expect(errors).toBeFalsy();
      expect(data?.folderInfo).toBeNull();
    });

    it("should return null if the user doesnt select a folder", async () => {
      requestWritableFolder.mockRejectedValue(new Error("some error"));

      const { data, errors } = await backend.mutate({
        mutation: gql`
          mutation RequestFolder {
            pickSdcardFolder {
              id
              name
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.pickSdcardFolder).toBeNull();
    });
  });
});
