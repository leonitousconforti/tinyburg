data "digitalocean_project" "myproject" {
    name = var.do_project_name
}

resource "digitalocean_project_resources" "myproject_resources" {
    project = data.digitalocean_project.myproject.id
    resources = [digitalocean_droplet.aosp-emu.urn]
}

resource "digitalocean_droplet" "aosp-emu" {
    region = "sfo3"
    size   = "s-1vcpu-2gb"
    image  = "ubuntu-22-10-x64"
    name   = "aosp-emu-1vcpu-2gb"
    tags = ["prod", "android-emulator"]
    ipv6 = true
    monitoring = true
    droplet_agent = true
}
