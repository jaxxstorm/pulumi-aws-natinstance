import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
export interface NatInstanceArgs {
    description?: string;
    amiId: string;
    vpcId: pulumi.Input<string> | string;
    publicSubnet: pulumi.Input<string> | string;
    privateRouteTableId: pulumi.Input<string> | string;
}
export declare class NatInstance extends pulumi.ComponentResource {
    launchTemplate: aws.ec2.LaunchTemplate;
    autoScalingGroup: aws.autoscaling.Group;
    securityGroup: aws.ec2.SecurityGroup;
    instanceProfile: aws.iam.InstanceProfile;
    iamRole: aws.iam.Role;
    networkInterface: aws.ec2.NetworkInterface;
    elasticIp: aws.ec2.Eip;
    publicRoute: aws.ec2.Route;
    private readonly name;
    constructor(name: string, args: NatInstanceArgs, opts?: pulumi.ComponentResourceOptions);
}
