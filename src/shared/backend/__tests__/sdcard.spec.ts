import gql from "graphql-tag";
import { MockedFunction } from "jest-mock";
import nock from "nock";
import { createExecutor } from "test-utils/backend";
import getOriginPrivateDirectory from "native-file-system-adapter/src/getOriginPrivateDirectory";
import nodeAdapter from "native-file-system-adapter/src/adapters/node";
import tmp from "tmp-promise";
import fs from "fs/promises";
import { directorySnapshot, waitForStageCompleted } from "test-utils/tools";
import path from "path";
import { SdcardWriteJobType } from "shared/backend/graph/sdcard";

const requestWritableDirectory = jest.fn() as MockedFunction<
  typeof window.showDirectoryPicker
>;

const backend = createExecutor({
  fileSystem: {
    requestWritableDirectory,
  },
});

describe("Query", () => {
  describe("edgeTxSdcardPackReleases", () => {
    it("should return the list of sdcard pack releases", async () => {
      const { nockDone } = await nock.back("sdcard-pack-releases.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxSdcardPackReleases {
              id
              name
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxSdcardPackReleases).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "latest",
            "name": "Latest",
          },
          Object {
            "id": "v2.5.0",
            "name": "EdgeTX \\"Dauntless\\" v2.5.0 SD Card Pack",
          },
          Object {
            "id": "v2.4.0-rc1",
            "name": "2.4.0-rc1",
          },
        ]
      `);
      nockDone();
    });
  });

  describe("edgeTxSdcardPackRelease", () => {
    it("should return the sdcard release and its targets", async () => {
      const { nockDone } = await nock.back("sdcard-pack-latest.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxSdcardPackRelease(id: "latest") {
              id
              name
              targets {
                id
                name
              }
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxSdcardPackRelease).toMatchInlineSnapshot(`
        Object {
          "id": "latest",
          "name": "Latest",
          "targets": Array [
            Object {
              "id": "x10",
              "name": "FrSky Horus X10",
            },
            Object {
              "id": "x10-access",
              "name": "FrSky Horus X10 Access",
            },
            Object {
              "id": "x12s",
              "name": "FrSky Horus X12s",
            },
            Object {
              "id": "t16",
              "name": "Jumper T16",
            },
            Object {
              "id": "t18",
              "name": "Jumper T18",
            },
            Object {
              "id": "tx16s",
              "name": "RadioMaster TX16S",
            },
            Object {
              "id": "nv14",
              "name": "Flysky NV14",
            },
            Object {
              "id": "x7",
              "name": "FrSky QX7",
            },
            Object {
              "id": "x7-access",
              "name": "FrSky QX7 Access",
            },
            Object {
              "id": "x9lite",
              "name": "FrSky X9 Lite",
            },
            Object {
              "id": "x9lites",
              "name": "FrSky X9 Lite S",
            },
            Object {
              "id": "xlite",
              "name": "FrSky X-Lite",
            },
            Object {
              "id": "xlites",
              "name": "FrSky X-Lite S",
            },
            Object {
              "id": "t12",
              "name": "Jumper T12",
            },
            Object {
              "id": "tlite",
              "name": "Jumper T-Lite",
            },
            Object {
              "id": "tpro",
              "name": "Jumper T-Pro",
            },
            Object {
              "id": "t8",
              "name": "RadioMaster T8",
            },
            Object {
              "id": "tx12",
              "name": "RadioMaster TX12",
            },
            Object {
              "id": "zorro",
              "name": "RadioMaster Zorro",
            },
            Object {
              "id": "x9d",
              "name": "FrSky X9D",
            },
            Object {
              "id": "x9dp",
              "name": "FrSky X9D Plus",
            },
            Object {
              "id": "x9dp2019",
              "name": "FrSky X9D Plus 2019",
            },
          ],
        }
      `);

      nockDone();
    });

    it("should return a default list of targets if the release version doesnt contain", async () => {
      const { nockDone } = await nock.back("sdcard-pack-v2.6.0.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxSdcardPackRelease(id: "v2.6.0") {
              id
              name
              targets {
                id
                name
              }
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxSdcardPackRelease).toMatchInlineSnapshot(`
        Object {
          "id": "v2.6.0",
          "name": "EdgeTX \\"Santa\\" v2.6.0 SD Card Pack ",
          "targets": Array [
            Object {
              "id": "t16",
              "name": "Jumper T16",
            },
            Object {
              "id": "t18",
              "name": "Jumper T18",
            },
            Object {
              "id": "x10",
              "name": "Frsky Horus X10",
            },
            Object {
              "id": "x10-access",
              "name": "Frsky Horus X10 Access",
            },
            Object {
              "id": "x12s",
              "name": "Frsky Horus X12s",
            },
            Object {
              "id": "tx16s",
              "name": "Radiomaster TX16s",
            },
            Object {
              "id": "nv14",
              "name": "Flysky NV14",
            },
            Object {
              "id": "tlite",
              "name": "Jumper T-Lite",
            },
            Object {
              "id": "tpro",
              "name": "Jumper T-Pro",
            },
            Object {
              "id": "t12",
              "name": "Jumper T12",
            },
            Object {
              "id": "x7",
              "name": "Frsky QX7",
            },
            Object {
              "id": "x7-access",
              "name": "Frsky QX7 Access",
            },
            Object {
              "id": "xlite",
              "name": "Frsky X-Lite",
            },
            Object {
              "id": "xlites",
              "name": "Frsky X-Lite S",
            },
            Object {
              "id": "x9lite",
              "name": "Frsky X9 Lite",
            },
            Object {
              "id": "x9lites",
              "name": "Frsky X9 Lite S",
            },
            Object {
              "id": "t8",
              "name": "RadioMaster T8",
            },
            Object {
              "id": "tx12",
              "name": "Radiomaster TX12",
            },
            Object {
              "id": "zorro",
              "name": "RadioMaster Zorro",
            },
            Object {
              "id": "x9d",
              "name": "Frsky X9D",
            },
            Object {
              "id": "x9dp",
              "name": "Frsky X9D Plus",
            },
            Object {
              "id": "x9dp2019",
              "name": "Frsky X9D Plus 2019",
            },
          ],
        }
      `);

      nockDone();
    });

    it("should return null if the release doesn't exist", async () => {
      const { nockDone } = await nock.back("sdcard-pack-not-exist.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxSdcardPackRelease(id: "some-unknown-release") {
              id
              name
              targets {
                id
                name
              }
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxSdcardPackRelease).toBeNull();

      nockDone();
    });
  });

  describe("edgeTxSoundsRelease", () => {
    it("should return the available sounds for the sdcard park", async () => {
      const { nockDone } = await nock.back("sdcard-sounds-releases.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxSoundsRelease(forPack: "v2.5.0", isPrerelease: false) {
              id
              name
              sounds
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxSoundsRelease).toMatchInlineSnapshot(`
        Object {
          "id": "v2.5.3",
          "name": "2.5.3",
          "sounds": Array [
            "zh",
            "cs",
            "de",
            "en",
            "es",
            "fr",
            "it",
            "pt",
            "ru",
          ],
        }
      `);

      nockDone();
    });
  });

  it("should return prerelease sounds for a prerelease version", async () => {
    const { nockDone } = await nock.back("sdcard-sounds-releases.json");

    const { data, errors } = await backend.query({
      query: gql`
        query {
          edgeTxSoundsRelease(forPack: "v2.4.0-rc1", isPrerelease: true) {
            id
            name
          }
        }
      `,
    });

    expect(errors).toBeFalsy();
    expect(data?.edgeTxSoundsRelease).toMatchInlineSnapshot(`
      Object {
        "id": "v2.4.0-rc3",
        "name": "2.4.0-rc3",
      }
    `);
    nockDone();
  });

  it("should return the next lowest sdcard sounds version available", async () => {
    const { nockDone } = await nock.back(
      "sdcard-sounds-releases-missing-v2.6.0.json"
    );

    const { data, errors } = await backend.query({
      query: gql`
        query {
          edgeTxSoundsRelease(forPack: "v2.6.0", isPrerelease: false) {
            id
            name
          }
        }
      `,
    });

    expect(errors).toBeFalsy();
    expect(data?.edgeTxSoundsRelease).toMatchInlineSnapshot(`
      Object {
        "id": "v2.5.3",
        "name": "2.5.3",
      }
    `);
    nockDone();
  });
});

describe("Mutation", () => {
  let tempDir: tmp.DirectoryResult;
  jest.setTimeout(20000);

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup().catch(() => {});
  });

  describe("pickSdcardDirectory", () => {
    it("should return a file system handler requested by the user", async () => {
      requestWritableDirectory.mockResolvedValue({
        name: "/some/directory/path",
      } as FileSystemDirectoryHandle);

      const { data, errors } = await backend.mutate({
        mutation: gql`
          mutation RequestDirectory {
            pickSdcardDirectory {
              id
              name
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.pickSdcardDirectory).toEqual({
        id: expect.any(String),
        name: "/some/directory/path",
      });
    });

    it("should allow the directory info to be queried after being picked", async () => {
      const handle = await getOriginPrivateDirectory(nodeAdapter, tempDir.path);
      // @ts-expect-error is readonly but this is testing
      handle.name = tempDir.path;
      requestWritableDirectory.mockResolvedValueOnce(handle);

      const requestDirectoryResponse = await backend.mutate({
        mutation: gql`
          mutation RequestDirectory {
            pickSdcardDirectory {
              id
              name
            }
          }
        `,
      });

      const { id } = requestDirectoryResponse.data?.pickSdcardDirectory as {
        id: string;
      };

      const { data, errors } = await backend.query({
        query: gql`
          query SdcardDirectoryQuery($id: ID!) {
            sdcardDirectory(id: $id) {
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
      expect(data?.sdcardDirectory).toEqual({
        id,
        name: tempDir.path,
      });
    });

    it("should return null if the directory can no longer be read", async () => {
      requestWritableDirectory.mockResolvedValueOnce(
        await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
      );

      const requestDirectoryResponse = await backend.mutate({
        mutation: gql`
          mutation RequestDirectory {
            pickSdcardDirectory {
              id
              name
            }
          }
        `,
      });

      const { id } = requestDirectoryResponse.data?.pickSdcardDirectory as {
        id: string;
      };

      await fs.rmdir(tempDir.path);

      const { data, errors } = await backend.query({
        query: gql`
          query SdcardDirectoryQuery($id: ID!) {
            sdcardDirectory(id: $id) {
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
      expect(data?.sdcardDirectory).toEqual(null);
    });

    it("should only keep 5 directory handles", async () => {
      const currentHandles = await Promise.all(
        new Array(5).fill(1).map(async (_, i) => {
          requestWritableDirectory.mockResolvedValueOnce({
            name: `/some/directory/directory${i}`,
          } as FileSystemDirectoryHandle);

          const requestDirectoryResponse = await backend.mutate({
            mutation: gql`
              mutation RequestDirectory {
                pickSdcardDirectory {
                  id
                  name
                }
              }
            `,
          });

          const { id } = requestDirectoryResponse.data?.pickSdcardDirectory as {
            id: string;
          };

          return id;
        })
      );

      requestWritableDirectory.mockResolvedValueOnce({
        name: `/some/directory/directorylast`,
      } as FileSystemDirectoryHandle);

      // Request one more so the first should be gone
      await backend.mutate({
        mutation: gql`
          mutation RequestFolder {
            pickSdcardDirectory {
              id
              name
            }
          }
        `,
      });

      const { data, errors } = await backend.query({
        query: gql`
          query SdcardDirectoryQuery($id: ID!) {
            sdcardDirectory(id: $id) {
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
      expect(data?.sdcardDirectory).toBeNull();
    });

    it("should return null if the user doesnt select a directory", async () => {
      requestWritableDirectory.mockRejectedValue(new Error("some error"));

      const { data, errors } = await backend.mutate({
        mutation: gql`
          mutation RequestDirectory {
            pickSdcardDirectory {
              id
              name
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.pickSdcardDirectory).toBeNull();
    });

    describe("isValid", () => {
      it.each([
        "THEMES",
        "SOUNDS",
        "FIRMWARE",
        "edgetx.sdcard.version",
        "SCRIPTS",
        "SCREENSHOTS",
      ])(
        "should return true if the directory contains %s",
        async (name: string) => {
          requestWritableDirectory.mockResolvedValueOnce(
            await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
          );

          await fs.writeFile(path.join(tempDir.path, name), "");
          const { data, errors } = await backend.mutate({
            mutation: gql`
              mutation RequestFolder {
                pickSdcardDirectory {
                  id
                  name
                  isValid
                }
              }
            `,
          });

          expect(errors).toBeFalsy();
          expect(data?.pickSdcardDirectory).toMatchObject({
            isValid: true,
          });
        }
      );

      it("should return false if the directory contains %", async () => {
        requestWritableDirectory.mockResolvedValueOnce(
          await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
        );

        await fs.writeFile(path.join(tempDir.path, "some-other-file"), "");
        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RequestFolder {
              pickSdcardDirectory {
                id
                name
                isValid
              }
            }
          `,
        });

        expect(errors).toBeFalsy();
        expect(data?.pickSdcardDirectory).toMatchObject({
          isValid: false,
        });
      });
    });

    describe("sounds", () => {
      it("should return the sounds stored in the SD Card", async () => {
        requestWritableDirectory.mockResolvedValueOnce(
          await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
        );

        await Promise.all(
          ["en", "cn", "fr", "es"].map(async (folderName) => {
            await fs.mkdir(path.join(tempDir.path, "SOUNDS", folderName), {
              recursive: true,
            });
          })
        );

        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RequestFolder {
              pickSdcardDirectory {
                id
                sounds {
                  ids
                  version
                }
              }
            }
          `,
        });

        expect(errors).toBeFalsy();
        expect(data?.pickSdcardDirectory).toMatchObject({
          sounds: {
            ids: expect.arrayContaining(["cn", "en", "es", "fr"]),
            version: null,
          },
        });
      });

      it("should return no sounds if there is no SOUNDS directory", async () => {
        requestWritableDirectory.mockResolvedValueOnce(
          await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
        );

        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RequestFolder {
              pickSdcardDirectory {
                id
                sounds {
                  ids
                }
              }
            }
          `,
        });

        expect(errors).toBeFalsy();
        expect(data?.pickSdcardDirectory).toMatchObject({
          sounds: {
            ids: [],
          },
        });
      });
    });

    describe("themes", () => {
      it("should not return any themes if there is no THEMES directory", async () => {
        requestWritableDirectory.mockResolvedValueOnce(
          await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
        );

        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RequestFolder {
              pickSdcardDirectory {
                id
                themes
              }
            }
          `,
        });
        expect(errors).toBeFalsy();
        expect(data?.pickSdcardDirectory).toMatchObject({
          themes: [],
        });
      });

      describe("in legacy format", () => {
        it("should return themes stored on the sdcard", async () => {
          requestWritableDirectory.mockResolvedValueOnce(
            await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
          );

          await fs.mkdir(path.join(tempDir.path, "THEMES"));

          await Promise.all(
            ["dark", "light", "green", "blue"]
              .map(async (themeName) => {
                await fs.writeFile(
                  path.join(tempDir.path, "THEMES", `${themeName}.yml`),
                  ""
                );
              })
              .concat(
                ["otherfiles.png", "anotherfile.txt"].map(async (file) => {
                  await fs.writeFile(
                    path.join(tempDir.path, "THEMES", file),
                    ""
                  );
                })
              )
          );

          const { data, errors } = await backend.mutate({
            mutation: gql`
              mutation RequestFolder {
                pickSdcardDirectory {
                  id
                  themes
                }
              }
            `,
          });
          expect(errors).toBeFalsy();
          expect(data?.pickSdcardDirectory).toMatchObject({
            themes: expect.arrayContaining(["dark", "light", "green", "blue"]),
          });
        });
      });

      describe("v2.6+", () => {
        it("should return themes stored on the sdcard", async () => {
          requestWritableDirectory.mockResolvedValueOnce(
            await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
          );

          await Promise.all(
            ["dark", "light", "green", "blue"].map(async (themeName) => {
              await fs.mkdir(path.join(tempDir.path, "THEMES", themeName), {
                recursive: true,
              });

              await fs.writeFile(
                path.join(tempDir.path, "THEMES", themeName, "theme.yml"),
                ""
              );
            })
          );

          await Promise.all(
            ["not-a-theme", "also-not-a-theme"].map(async (themeName) => {
              await fs.mkdir(path.join(tempDir.path, "THEMES", themeName), {
                recursive: true,
              });

              await fs.writeFile(
                path.join(tempDir.path, "THEMES", themeName, "something.xml"),
                ""
              );
            })
          );

          const { data, errors } = await backend.mutate({
            mutation: gql`
              mutation RequestFolder {
                pickSdcardDirectory {
                  id
                  themes
                }
              }
            `,
          });
          expect(errors).toBeFalsy();
          expect(data?.pickSdcardDirectory).toMatchObject({
            themes: expect.arrayContaining(["dark", "light", "green", "blue"]),
          });
        });
      });
    });

    describe("pack", () => {
      describe("version", () => {
        it("should return the version from edgetx.sdcard.version file", async () => {
          requestWritableDirectory.mockResolvedValueOnce(
            await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
          );

          await fs.writeFile(
            path.join(tempDir.path, "edgetx.sdcard.version"),
            "v2.5.4\nsomeotherline"
          );

          const { data, errors } = await backend.mutate({
            mutation: gql`
              mutation RequestFolder {
                pickSdcardDirectory {
                  id
                  pack {
                    version
                  }
                }
              }
            `,
          });
          expect(errors).toBeFalsy();
          expect(data?.pickSdcardDirectory).toMatchObject({
            pack: {
              version: "v2.5.4",
            },
          });
        });

        it("should return null if there is no edgetx.sdcard.version file", async () => {
          requestWritableDirectory.mockResolvedValueOnce(
            await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
          );

          const { data, errors } = await backend.mutate({
            mutation: gql`
              mutation RequestFolder {
                pickSdcardDirectory {
                  id
                  pack {
                    version
                  }
                }
              }
            `,
          });
          expect(errors).toBeFalsy();
          expect(data?.pickSdcardDirectory).toMatchObject({
            pack: {
              version: null,
            },
          });
        });
      });

      describe("target", () => {
        it("should return the target from edgetx.sdcard.target file", async () => {
          requestWritableDirectory.mockResolvedValueOnce(
            await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
          );

          await fs.writeFile(
            path.join(tempDir.path, "edgetx.sdcard.target"),
            "nv14\nsomeotherline"
          );

          const { data, errors } = await backend.mutate({
            mutation: gql`
              mutation RequestFolder {
                pickSdcardDirectory {
                  id
                  pack {
                    target
                  }
                }
              }
            `,
          });
          expect(errors).toBeFalsy();
          expect(data?.pickSdcardDirectory).toMatchObject({
            pack: { target: "nv14" },
          });
        });

        it("should return null if there is no edgetx.sdcard.target file", async () => {
          requestWritableDirectory.mockResolvedValueOnce(
            await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
          );

          const { data, errors } = await backend.mutate({
            mutation: gql`
              mutation RequestFolder {
                pickSdcardDirectory {
                  id
                  pack {
                    target
                  }
                }
              }
            `,
          });
          expect(errors).toBeFalsy();
          expect(data?.pickSdcardDirectory).toMatchObject({
            pack: { target: null },
          });
        });
      });
    });
  });
});

const waitForSdcardJobCompleted = async (jobId: string) => {
  const queue =
    backend.context.sdcardJobs.jobUpdates.asyncIterator<SdcardWriteJobType>(
      jobId
    );

  return waitForStageCompleted(queue, "write");
};

describe("Sdcard Job", () => {
  let tempDir: tmp.DirectoryResult;
  jest.setTimeout(60000);

  beforeEach(async () => {
    tempDir = await tmp.dir({ unsafeCleanup: true });
  });

  afterEach(async () => {
    await tempDir.cleanup();
  });

  it("should extract the specified sdcard target and sounds to the desired sdcard", async () => {
    requestWritableDirectory.mockResolvedValue(
      await getOriginPrivateDirectory(nodeAdapter, tempDir.path)
    );

    await Promise.all([
      // This directory should not be deleted so should be in snapshot
      fs.mkdir(path.join(tempDir.path, "EEPROM")),
      // this should be deleted as we are providing sounds
      fs.mkdir(path.join(tempDir.path, "SOUNDS", "some-initial-sounds"), {
        recursive: true,
      }),
    ]);

    const directoryRequest = await backend.mutate({
      mutation: gql`
        mutation RequestDirectory {
          pickSdcardDirectory {
            id
            name
          }
        }
      `,
    });

    const { id: directoryId } = directoryRequest.data?.pickSdcardDirectory as {
      id: string;
    };

    const { nockDone } = await nock.back(
      "sdcard-job-jumper-t8-cn-latest.json",
      {
        recorder: { enable_reqheaders_recording: true },
      }
    );

    const createJobRequest = await backend.mutate({
      mutation: gql`
        mutation CreateSdcardJob($directoryId: ID!) {
          createSdcardWriteJob(
            directoryId: $directoryId
            pack: { target: "t8", version: "latest" }
            sounds: { ids: ["cn"], version: "latest" }
          ) {
            id
          }
        }
      `,
      variables: {
        directoryId,
      },
    });

    const jobId = (
      createJobRequest.data?.createSdcardWriteJob as { id: string } | null
    )?.id;

    expect(createJobRequest.errors).toBeFalsy();

    expect(jobId).toBeTruthy();

    await waitForSdcardJobCompleted(jobId!);
    nockDone();

    const { data, errors } = await backend.query({
      query: gql`
        query SdcardJobStatus($id: ID!) {
          sdcardWriteJobStatus(jobId: $id) {
            cancelled
            stages {
              download {
                started
                completed
                progress
              }
              erase {
                started
                completed
                progress
              }
              write {
                started
                completed
                progress
              }
            }
          }
        }
      `,
      variables: {
        id: jobId,
      },
    });

    expect(errors).toBeFalsy();
    expect(data).toMatchInlineSnapshot(`
      Object {
        "sdcardWriteJobStatus": Object {
          "cancelled": false,
          "stages": Object {
            "download": Object {
              "completed": true,
              "progress": 100,
              "started": true,
            },
            "erase": Object {
              "completed": true,
              "progress": 100,
              "started": true,
            },
            "write": Object {
              "completed": true,
              "progress": 100,
              "started": true,
            },
          },
        },
      }
    `);
    expect(directorySnapshot(tempDir.path)).toMatchSnapshot();
  });
});
