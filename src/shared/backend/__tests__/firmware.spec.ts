import { gql } from "@apollo/client";
import { createExecutor } from "test-utils/backend";
import nock from "nock";
import md5 from "md5";

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
        [
          {
            "id": "nightly",
            "name": "nightly",
          },
          {
            "id": "v2.5.0",
            "name": "EdgeTX "Dauntless" 2.5.0",
          },
          {
            "id": "v2.5.0-rc3",
            "name": "EdgeTX "Dauntless" 2.5.0-RC3",
          },
          {
            "id": "v2.5.0-rc2",
            "name": "EdgeTX "Dauntless" 2.5.0-RC2",
          },
          {
            "id": "v2.5.0-rc1",
            "name": "EdgeTX "Dauntless" 2.5.0-RC1",
          },
          {
            "id": "v2.4.0",
            "name": "EdgeTX "Endeavour" 2.4.0",
          },
          {
            "id": "v2.4.0-rc4",
            "name": "EdgeTX Endeavour (2.4.0) RC4",
          },
          {
            "id": "v2.4.0-rc3",
            "name": "EdgeTX Endeavour (2.4.0) RC3",
          },
          {
            "id": "v2.4.0-rc2",
            "name": "EdgeTX Endeavour (2.4.0) RC2",
          },
          {
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
          {
            "firmwareBundle": {
              "targets": [
                {
                  "code": "nv14",
                  "id": "nv14-50406116",
                  "name": "Flysky NV14",
                },
                {
                  "code": "x10",
                  "id": "x10-50406116",
                  "name": "Frsky Horus X10",
                },
                {
                  "code": "x10-access",
                  "id": "x10-access-50406116",
                  "name": "Frsky Horus X10 Access",
                },
                {
                  "code": "x12s",
                  "id": "x12s-50406116",
                  "name": "Frsky Horus X12s",
                },
                {
                  "code": "x7",
                  "id": "x7-50406116",
                  "name": "Frsky QX7",
                },
                {
                  "code": "x7-access",
                  "id": "x7-access-50406116",
                  "name": "Frsky QX7 Access",
                },
                {
                  "code": "x9d",
                  "id": "x9d-50406116",
                  "name": "Frsky X9D",
                },
                {
                  "code": "x9dp",
                  "id": "x9dp-50406116",
                  "name": "Frsky X9D Plus",
                },
                {
                  "code": "x9dp2019",
                  "id": "x9dp2019-50406116",
                  "name": "Frsky X9D Plus 2019",
                },
                {
                  "code": "x9lite",
                  "id": "x9lite-50406116",
                  "name": "Frsky X9 Lite",
                },
                {
                  "code": "x9lites",
                  "id": "x9lites-50406116",
                  "name": "Frsky X9 Lite S",
                },
                {
                  "code": "xlite",
                  "id": "xlite-50406116",
                  "name": "Frsky X-Lite",
                },
                {
                  "code": "xlites",
                  "id": "xlites-50406116",
                  "name": "Frsky X-Lite S",
                },
                {
                  "code": "t8",
                  "id": "t8-50406116",
                  "name": "Jumper T8",
                },
                {
                  "code": "t12",
                  "id": "t12-50406116",
                  "name": "Jumper T12",
                },
                {
                  "code": "t16",
                  "id": "t16-50406116",
                  "name": "Jumper T16",
                },
                {
                  "code": "t18",
                  "id": "t18-50406116",
                  "name": "Jumper T18",
                },
                {
                  "code": "tlite",
                  "id": "tlite-50406116",
                  "name": "Jumper T-Lite",
                },
                {
                  "code": "tx12",
                  "id": "tx12-50406116",
                  "name": "Radiomaster TX12",
                },
                {
                  "code": "tx16s",
                  "id": "tx16s-50406116",
                  "name": "Radiomaster TX16s",
                },
              ],
            },
            "id": "v2.5.0",
            "name": "EdgeTX "Dauntless" 2.5.0",
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
            {
              "firmwareBundle": {
                "target": {
                  "code": "t8",
                  "id": "t8-50406116",
                  "name": "Jumper T8",
                },
              },
              "id": "v2.5.0",
              "name": "EdgeTX "Dauntless" 2.5.0",
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
            {
              "firmwareBundle": {
                "target": null,
              },
              "id": "v2.5.0",
              "name": "EdgeTX "Dauntless" 2.5.0",
            }
          `);
          nockDone();
        });

        describe("base64Data", () => {
          describe("For firmwares within sub folder", () => {
            it("should return the firmware data in base64 Format", async () => {
              const { nockDone } = await nock.back(
                "firmware-bundle-with-sub-folder.json"
              );

              const { data, errors } = await backend.query({
                query: gql`
                  query {
                    edgeTxRelease(id: "nightly") {
                      id
                      firmwareBundle {
                        target(code: "nv14") {
                          id
                          base64Data
                        }
                      }
                    }
                  }
                `,
              });

              expect(errors).toBeFalsy();
              const base64Data = (data?.edgeTxRelease as any)?.firmwareBundle
                .target?.base64Data as string;

              expect(base64Data).toBeTruthy();
              expect(base64Data.length).toBeGreaterThan(1);
              expect(md5(base64Data)).toMatchInlineSnapshot(
                `"8143ce85f92f099179cc1bd3ab44c656"`
              );

              nockDone();
            });
          });

          describe("For firmwares without sub folder in bundle", () => {
            it("should return the firmware data in base64 Format", async () => {
              const { nockDone } = await nock.back(
                "firmware-bundle-without-sub-folder.json"
              );

              const { data, errors } = await backend.query({
                query: gql`
                  query {
                    edgeTxRelease(id: "v2.7.0") {
                      id
                      firmwareBundle {
                        target(code: "nv14") {
                          id
                          base64Data
                        }
                      }
                    }
                  }
                `,
              });

              expect(errors).toBeFalsy();
              const base64Data = (data?.edgeTxRelease as any)?.firmwareBundle
                .target?.base64Data as string;

              expect(base64Data).toBeTruthy();
              expect(base64Data.length).toBeGreaterThan(1);
              expect(md5(base64Data)).toMatchInlineSnapshot(
                '"a748b9132f1d3e84d4f679e68a1ea83f"'
              );

              nockDone();
            });
          });
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
        [
          {
            "headCommitId": "815a632902236b6b766f6db52d15e8ec363bd487",
            "id": "446",
            "name": "sfjuocekr:2.4",
          },
          {
            "headCommitId": "2fceb40b70432378d9e0693e0d3939221799ba86",
            "id": "984",
            "name": "EdgeTX:crsf-support-lua-command-id",
          },
          {
            "headCommitId": "621a6833106e744b7e4b616ad6218af7c7d47e19",
            "id": "1009",
            "name": "jfrickmann:LCD",
          },
          {
            "headCommitId": "ceafdea344cd9bc021dd083fe4a487393edb1458",
            "id": "980",
            "name": "EdgeTX:nv14-bigger-controls",
          },
          {
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
          {
            "commits": [
              {
                "id": "217c02e6e06b4500edbb0eca99b5d1d077111aab",
              },
              {
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
            {
              "commit": {
                "firmwareBundle": {
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
              {
                "commit": {
                  "firmwareBundle": {
                    "id": "135237194",
                    "target": {
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
