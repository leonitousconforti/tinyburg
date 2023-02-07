resource "digitalocean_record" "emulator_ipv4_dns" {
    type   = "A"
    name   = "emulator"
    domain = var.domain_name
    value  = digitalocean_droplet.aosp-emu.ipv4_address
}

resource "digitalocean_record" "emulator_ipv6_dns" {
    type   = "AAAA"
    name   = "emulator"
    domain = var.domain_name
    value  = digitalocean_droplet.aosp-emu.ipv6_address
}
