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
                    code
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
                  "code": "nv14",
                  "id": "nv14-50406116",
                  "name": "Flysky NV14",
                },
                Object {
                  "code": "x10",
                  "id": "x10-50406116",
                  "name": "Frsky Horus X10",
                },
                Object {
                  "code": "x10-access",
                  "id": "x10-access-50406116",
                  "name": "Frsky Horus X10 Access",
                },
                Object {
                  "code": "x12s",
                  "id": "x12s-50406116",
                  "name": "Frsky Horus X12s",
                },
                Object {
                  "code": "x7",
                  "id": "x7-50406116",
                  "name": "Frsky QX7",
                },
                Object {
                  "code": "x7-access",
                  "id": "x7-access-50406116",
                  "name": "Frsky QX7 Access",
                },
                Object {
                  "code": "x9d",
                  "id": "x9d-50406116",
                  "name": "Frsky X9D",
                },
                Object {
                  "code": "x9dp",
                  "id": "x9dp-50406116",
                  "name": "Frsky X9D Plus",
                },
                Object {
                  "code": "x9dp2019",
                  "id": "x9dp2019-50406116",
                  "name": "Frsky X9D Plus 2019",
                },
                Object {
                  "code": "x9lite",
                  "id": "x9lite-50406116",
                  "name": "Frsky X9 Lite",
                },
                Object {
                  "code": "x9lites",
                  "id": "x9lites-50406116",
                  "name": "Frsky X9 Lite S",
                },
                Object {
                  "code": "xlite",
                  "id": "xlite-50406116",
                  "name": "Frsky X-Lite",
                },
                Object {
                  "code": "xlites",
                  "id": "xlites-50406116",
                  "name": "Frsky X-Lite S",
                },
                Object {
                  "code": "t8",
                  "id": "t8-50406116",
                  "name": "Jumper T8",
                },
                Object {
                  "code": "t12",
                  "id": "t12-50406116",
                  "name": "Jumper T12",
                },
                Object {
                  "code": "t16",
                  "id": "t16-50406116",
                  "name": "Jumper T16",
                },
                Object {
                  "code": "t18",
                  "id": "t18-50406116",
                  "name": "Jumper T18",
                },
                Object {
                  "code": "tlite",
                  "id": "tlite-50406116",
                  "name": "Jumper T-Lite",
                },
                Object {
                  "code": "tx12",
                  "id": "tx12-50406116",
                  "name": "Radiomaster TX12",
                },
                Object {
                  "code": "tx16s",
                  "id": "tx16s-50406116",
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
                    target(code: "t8") {
                      id
                      code
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
                  "code": "t8",
                  "id": "t8-50406116",
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
                    target(code: "some-weird-radio-id") {
                      id
                      code
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
                        target(code: "nv14") {
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
                      "id": "nv14-135237194",
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
