import { describe, expect, it } from "@jest/globals";
import gql from "graphql-tag";
import { createExecutor } from "test-utils/backend";
import nock from "nock";

const backend = createExecutor();

describe("Query", () => {
  describe("edgeTxReleases", () => {
    it("should return the releases from the edgetx github project", async () => {
      const { nockDone } = await nock.back("firmware-releases.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxReleases {
              id
              name
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxReleases).toMatchInlineSnapshot(`
        Array [
          Object {
            "id": "nightly",
            "name": "nightly",
          },
          Object {
            "id": "v2.5.0",
            "name": "EdgeTX \\"Dauntless\\" 2.5.0",
          },
          Object {
            "id": "v2.5.0-rc3",
            "name": "EdgeTX \\"Dauntless\\" 2.5.0-RC3",
          },
          Object {
            "id": "v2.5.0-rc2",
            "name": "EdgeTX \\"Dauntless\\" 2.5.0-RC2",
          },
          Object {
            "id": "v2.5.0-rc1",
            "name": "EdgeTX \\"Dauntless\\" 2.5.0-RC1",
          },
          Object {
            "id": "v2.4.0",
            "name": "EdgeTX \\"Endeavour\\" 2.4.0",
          },
          Object {
            "id": "v2.4.0-rc4",
            "name": "EdgeTX Endeavour (2.4.0) RC4",
          },
          Object {
            "id": "v2.4.0-rc3",
            "name": "EdgeTX Endeavour (2.4.0) RC3",
          },
          Object {
            "id": "v2.4.0-rc2",
            "name": "EdgeTX Endeavour (2.4.0) RC2",
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

  describe("edgeTxRelease", () => {
    it("should return the edgetx release with the given tag id", async () => {
      const { nockDone } = await nock.back("firmware-by-tag-id.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxRelease(id: "v2.5.0") {
              id
              name
              description
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect(data?.edgeTxRelease).toEqual({
        id: "v2.5.0",
        name: 'EdgeTX "Dauntless" 2.5.0',
        description: expect.any(String),
      });
      nockDone();
    });

    describe("firmewareBundle", () => {
      it("should return the targets by reading the release firmware bundle", async () => {
        const { nockDone } = await nock.back("firmware-with-targets.json");

        const { data, errors } = await backend.query({
          query: gql`
            query {
              edgeTxRelease(id: "v2.5.0") {
                id
                name
                firmwareBundle {
                  targets {
                    id
                    name
                  }
                }
              }
            }
          `,
        });

        expect(errors).toBeFalsy();
        expect(data?.edgeTxRelease).toMatchInlineSnapshot(`
          Object {
            "firmwareBundle": Object {
              "targets": Array [
                Object {
                  "id": "nv14",
                  "name": "Flysky NV14",
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
                  "id": "x7",
                  "name": "Frsky QX7",
                },
                Object {
                  "id": "x7-access",
                  "name": "Frsky QX7 Access",
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
                Object {
                  "id": "x9lite",
                  "name": "Frsky X9 Lite",
                },
                Object {
                  "id": "x9lites",
                  "name": "Frsky X9 Lite S",
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
                  "id": "t8",
                  "name": "Jumper T8",
                },
                Object {
                  "id": "t12",
                  "name": "Jumper T12",
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
                  "id": "tlite",
                  "name": "Jumper T-Lite",
                },
                Object {
                  "id": "tx12",
                  "name": "Radiomaster TX12",
                },
                Object {
                  "id": "tx16s",
                  "name": "Radiomaster TX16s",
                },
              ],
            },
            "id": "v2.5.0",
            "name": "EdgeTX \\"Dauntless\\" 2.5.0",
          }
        `);
        nockDone();
      });

      describe("targets", () => {
        it("should return the target details by reading the firmware bundle", async () => {
          const { nockDone } = await nock.back("firmware-with-targets.json");

          const { data, errors } = await backend.query({
            query: gql`
              query {
                edgeTxRelease(id: "v2.5.0") {
                  id
                  name
                  firmwareBundle {
                    target(id: "t8") {
                      id
                      name
                    }
                  }
                }
              }
            `,
          });

          expect(errors).toBeFalsy();
          expect(data?.edgeTxRelease).toMatchInlineSnapshot(`
            Object {
              "firmwareBundle": Object {
                "target": Object {
                  "id": "t8",
                  "name": "Jumper T8",
                },
              },
              "id": "v2.5.0",
              "name": "EdgeTX \\"Dauntless\\" 2.5.0",
            }
          `);
          nockDone();
        });

        it("should return null if the the target doesnt exist in the firmware bundle", async () => {
          const { nockDone } = await nock.back("firmware-with-targets.json");

          const { data, errors } = await backend.query({
            query: gql`
              query {
                edgeTxRelease(id: "v2.5.0") {
                  id
                  name
                  firmwareBundle {
                    target(id: "some-weird-radio-id") {
                      id
                      name
                    }
                  }
                }
              }
            `,
          });

          expect(errors).toBeFalsy();
          expect(data?.edgeTxRelease).toMatchInlineSnapshot(`
            Object {
              "firmwareBundle": Object {
                "target": null,
              },
              "id": "v2.5.0",
              "name": "EdgeTX \\"Dauntless\\" 2.5.0",
            }
          `);
          nockDone();
        });
      });
    });
  });

  describe("edgeTxPrs", () => {
    it("should return a list of open PRs", async () => {
      const { nockDone } = await nock.back("edgetx-prs.json");

      const { data, errors } = await backend.query({
        query: gql`
          query {
            edgeTxPrs {
              id
              name
              headCommitId
            }
          }
        `,
      });

      expect(errors).toBeFalsy();
      expect((data?.edgeTxPrs as any[]).slice(0, 5)).toMatchInlineSnapshot(`
        Array [
          Object {
            "headCommitId": "815a632902236b6b766f6db52d15e8ec363bd487",
            "id": "446",
            "name": "sfjuocekr:2.4",
          },
          Object {
            "headCommitId": "2fceb40b70432378d9e0693e0d3939221799ba86",
            "id": "984",
            "name": "EdgeTX:crsf-support-lua-command-id",
          },
          Object {
            "headCommitId": "621a6833106e744b7e4b616ad6218af7c7d47e19",
            "id": "1009",
            "name": "jfrickmann:LCD",
          },
          Object {
            "headCommitId": "ceafdea344cd9bc021dd083fe4a487393edb1458",
            "id": "980",
            "name": "EdgeTX:nv14-bigger-controls",
          },
          Object {
            "headCommitId": "c05c7066af63dfd30df28fbf1355ef19eca0f574",
            "id": "1115",
            "name": "stronnag:add_MP_header_to_Telem_Mirror",
          },
        ]
      `);
      nockDone();
    });
  });
  describe("edgeTxPr", () => {
    describe("commits", () => {
      it("should return the commits associated with the PR", async () => {
        const { nockDone } = await nock.back("edgetx-single-pr.json");

        const { data, errors } = await backend.query({
          query: gql`
            query {
              edgeTxPr(id: "1337") {
                id
                name
                commits {
                  id
                }
                title
                description
                headCommitId
              }
            }
          `,
        });

        expect(errors).toBeFalsy();
        expect(data?.edgeTxPr).toMatchInlineSnapshot(`
          Object {
            "commits": Array [
              Object {
                "id": "217c02e6e06b4500edbb0eca99b5d1d077111aab",
              },
              Object {
                "id": "b9319c5428aab118b9473e98fcde996355333c8c",
              },
            ],
            "description": "This fixes one incorrect use of potential unterminated cstrings for the ctor of std::string.",
            "headCommitId": "b9319c5428aab118b9473e98fcde996355333c8c",
            "id": "1337",
            "name": "wimalopaan:wm1333",
            "title": "Potential out of bounds access of flightmode name on main screen (#1333)",
          }
        `);
        nockDone();
      });
    });

    describe("commit", () => {
      describe("firmwareBundle", () => {
        it("should return the firmware bundle info", async () => {
          const { nockDone } = await nock.back(
            "edgetx-single-pr-single-commit-firmware-bundle.json"
          );

          const { data, errors } = await backend.query({
            query: gql`
              query {
                edgeTxPr(id: "1337") {
                  id
                  name
                  commit(id: "217c02e6e06b4500edbb0eca99b5d1d077111aab") {
                    id
                    firmwareBundle {
                      id
                      url
                    }
                  }
                  headCommitId
                }
              }
            `,
          });

          expect(errors).toBeFalsy();
          expect((data?.edgeTxPr as any).commit.firmwareBundle).not.toBeNull();
          expect(data?.edgeTxPr as any).toMatchInlineSnapshot(`
            Object {
              "commit": Object {
                "firmwareBundle": Object {
                  "id": "135237194",
                  "url": "https://api.github.com/repos/EdgeTX/edgetx/actions/artifacts/135237194/zip",
                },
                "id": "217c02e6e06b4500edbb0eca99b5d1d077111aab",
              },
              "headCommitId": "b9319c5428aab118b9473e98fcde996355333c8c",
              "id": "1337",
              "name": "wimalopaan:wm1333",
            }
          `);
          nockDone();
        });

        describe("target", () => {
          it("should return the target details in the firmware bundle", async () => {
            const { nockDone } = await nock.back(
              "edgetx-single-pr-single-commit-firmware-bundle-target.json"
            );

            const { data, errors } = await backend.query({
              query: gql`
                query {
                  edgeTxPr(id: "1337") {
                    id
                    name
                    commit(id: "217c02e6e06b4500edbb0eca99b5d1d077111aab") {
                      id
                      firmwareBundle {
                        id
                        target(id: "nv14") {
                          id
                          name
                        }
                      }
                    }
                    headCommitId
                  }
                }
              `,
            });

            expect(errors).toBeFalsy();
            expect(
              (data?.edgeTxPr as any).commit.firmwareBundle.target
            ).not.toBeNull();
            expect(data?.edgeTxPr).toMatchInlineSnapshot(`
              Object {
                "commit": Object {
                  "firmwareBundle": Object {
                    "id": "135237194",
                    "target": Object {
                      "id": "nv14",
                      "name": "Flysky NV14",
                    },
                  },
                  "id": "217c02e6e06b4500edbb0eca99b5d1d077111aab",
                },
                "headCommitId": "fea444a1ec4915503e6da98de41ccb6bb74799a9",
                "id": "1337",
                "name": "wimalopaan:wm1333",
              }
            `);
            nockDone();
          }, 20000);
        });
      });
    });
  });
});

describe("Mutation", () => {
  describe("registerLocalFirmware", () => {
    it("should store the given firmware data and give it an ID", async () => {
      const base64Data = Buffer.from("some-firmware-data").toString("base64");
      const mutation = await backend.mutate({
        mutation: gql`
          mutation UploadFirmware($data: String!) {
            registerLocalFirmware(firmwareBase64Data: $data) {
              id
            }
          }
        `,
        variables: {
          data: base64Data,
        },
      });

      expect(mutation.errors).toBeFalsy();
      const { id } = mutation.data?.registerLocalFirmware as { id: string };

      const response = await backend.query({
        query: gql`
          query QueryLocalFirmware($id: ID!) {
            localFirmware(byId: $id) {
              id
              base64Data
            }
          }
        `,
        variables: {
          id,
        },
      });

      expect(response.errors).toBeFalsy();
      expect(response.data?.localFirmware).toEqual({
        id,
        base64Data,
      });
    });
  });
});
