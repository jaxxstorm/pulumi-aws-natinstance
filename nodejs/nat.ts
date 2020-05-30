import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi"

export interface NatInstanceArgs {
    description?: string;
    amiId: string;
    vpcId: pulumi.Input<string> | string;
    publicSubnet: pulumi.Input<string> | string;
    privateRouteTableId: pulumi.Input<string> | string;
}

export class NatInstance extends pulumi.ComponentResource{

    launchTemplate: aws.ec2.LaunchTemplate;
    autoScalingGroup: aws.autoscaling.Group;
    securityGroup: aws.ec2.SecurityGroup;
    instanceProfile: aws.iam.InstanceProfile;
    iamRole: aws.iam.Role;
    networkInterface: aws.ec2.NetworkInterface;
    elasticIp: aws.ec2.Eip;
    publicRoute: aws.ec2.Route;

    private readonly name: string;

    constructor(name: string, args: NatInstanceArgs, opts?: pulumi.ComponentResourceOptions) {
        super("jaxxstorm:natinstance", name, {}, opts);

        this.name = name;

        /*
        IAM role
         */
        this.iamRole = new aws.iam.Role(`${name}-role`, {
            assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({ Service: "ec2.amazonaws.com" }),
        });

        /*
        Instance profile for the launch template
         */
        this.instanceProfile = new aws.iam.InstanceProfile(`${name}-instanceprofile`, {
            role: this.iamRole.id
        }, { parent: this.iamRole })

        /*
        Allow SSM management of the instances
         */
        new aws.iam.PolicyAttachment(`${name}-ssmattachment`, {
            policyArn: 'arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore',
            roles: [ this.iamRole.id ],
        }, { parent: this.iamRole })

         new aws.iam.RolePolicy(`${name}-enipolicy`, {
            role: this.iamRole.id,
            policy: {
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: [
                        "ec2:AttachNetworkInterface"
                    ],
                    Resource: "*", // FIXME: This needs to be better
                }],
            },
        }, { parent: this.iamRole });



        /*
        Create a security group for the instance
         */
        this.securityGroup = new aws.ec2.SecurityGroup(`${name}-securitygroup`, {
            vpcId: args.vpcId,
            description: args.description,
            ingress: [{
                description: "Ingress from private subnets",
                fromPort: 0,
                toPort: 65535,
                protocol: "tcp",
            }],
            egress: [{
                description: "Ingress to the internet",
                cidrBlocks: ["0.0.0.0/0"],
                fromPort: 0,
                toPort: 65535,
                protocol: "tcp",
            }]
        })


        /*
        Launch Template
         */
        this.launchTemplate = new aws.ec2.LaunchTemplate(`${name}-launchtemplate`,{
            namePrefix: `${name}-`,
            description: args.description,
            imageId: args.amiId,
            networkInterfaces: [{
                associatePublicIpAddress: "true",
                securityGroups: [this.securityGroup.id],
                deleteOnTermination: true,
            }]
        })

        /*
        AutoScaling Group
         */
        this.autoScalingGroup = new aws.autoscaling.Group(`${name}-asg`,{
            desiredCapacity: 1,
            minSize: 1,
            maxSize: 1,
            vpcZoneIdentifiers: [ args.publicSubnet ],
            mixedInstancesPolicy: {
                launchTemplate: {
                    launchTemplateSpecification: {
                        launchTemplateId: this.launchTemplate.id,
                        version: '$Latest',
                    },
                    overrides: [{ instanceType: 't3.micro', weightedCapacity: '1' }]
                },
                instancesDistribution: {
                    onDemandBaseCapacity: 1,
                    onDemandPercentageAboveBaseCapacity: 1,
                }
            }
        }, { parent: this.launchTemplate })

        this.networkInterface = new aws.ec2.NetworkInterface(`${name}-network-interface`, {
            securityGroups: [ this.securityGroup.id ],
            subnetId: args.publicSubnet,
            sourceDestCheck: false,
            description: args.description,
        })

        this.elasticIp = new aws.ec2.Eip(`${name}-elasticip`, {
            networkInterface: this.networkInterface.id,
        }, { parent: this.networkInterface })

        this.publicRoute = new aws.ec2.Route(`${name}-public-route`, {
            destinationCidrBlock: '0.0.0.0/0',
            networkInterfaceId: this.networkInterface.id,
            routeTableId: args.privateRouteTableId,
        }, { parent: this.networkInterface })
    }

}
