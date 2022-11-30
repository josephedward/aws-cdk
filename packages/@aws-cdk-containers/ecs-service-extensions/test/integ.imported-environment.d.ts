export {};
/**
 * Expect this stack to deploy and show a load balancer DNS address. When you
 * request the address with curl, you should see the name container's output.
 * The load balancer may response 503 Service Temporarily Unavailable for a
 * short while, before you can see the container output.
 *
 * Example:
 * ```
 * $ cdk --app 'node integ.imported-environment.js' deploy
 * ...
 * Outputs:
 * shared-cluster-integ.Serviceloadbalancerdnsoutput = share-Servi-6JALU1FDE36L-2093347098.us-east-1.elb.amazonaws.com
 * ...
 *
 * $ curl share-Servi-6JALU1FDE36L-2093347098.us-east-1.elb.amazonaws.com
 * Keira (ip-10-0-153-44.ec2.internal)
 * ```
 */
