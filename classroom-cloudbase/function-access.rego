package authz.user

default allow := false

# Only the classroom RPC. Provider identity and business roles are checked inside.
allow if {
  input.cloudbase.resource_type == "functions"
  input.cloudbase.resource_name == "classroom"
}
