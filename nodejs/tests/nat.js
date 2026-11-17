const assert = require("assert");
const pulumi = require("@pulumi/pulumi");
const resources = [];
pulumi.runtime.setMocks({
    newResource(type, name, inputs) {
        resources.push({ type, name, inputs });
        return { id: `${name}-id`, state: inputs };
    },
    call(token, args) { return args; },
}, "dependency-test", "offline", false);
const { NatInstance } = require("../dist/index.js");
const value = output => new Promise(resolve => output.apply(resolve));

describe("NAT instance with offline Pulumi mocks", () => {
    it("preserves launch configuration and private route wiring", async () => {
        const nat = new NatInstance("test", {
            amiId: "ami-test", vpcId: "vpc-test", publicSubnet: "subnet-public",
            privateRouteTableId: "rtb-private", description: "dependency smoke",
        });
        await Promise.all([
            value(nat.launchTemplate.urn), value(nat.autoScalingGroup.urn),
            value(nat.securityGroup.urn), value(nat.instanceProfile.urn),
            value(nat.iamRole.urn), value(nat.networkInterface.urn),
            value(nat.elasticIp.urn), value(nat.publicRoute.urn),
        ]);
        assert.strictEqual(await value(nat.launchTemplate.imageId), "ami-test");
        assert.strictEqual(await value(nat.securityGroup.vpcId), "vpc-test");
        assert.deepStrictEqual(await value(nat.autoScalingGroup.vpcZoneIdentifiers), ["subnet-public"]);
        assert.strictEqual(await value(nat.autoScalingGroup.desiredCapacity), 1);
        assert.strictEqual(await value(nat.networkInterface.sourceDestCheck), false);
        assert.strictEqual(await value(nat.publicRoute.routeTableId), "rtb-private");
        assert.strictEqual(await value(nat.publicRoute.networkInterfaceId), await value(nat.networkInterface.id));
        assert.strictEqual(await value(nat.elasticIp.networkInterface), await value(nat.networkInterface.id));
        assert.ok(resources.some(resource => resource.type === "aws:ec2/launchTemplate:LaunchTemplate"));
    });
});
