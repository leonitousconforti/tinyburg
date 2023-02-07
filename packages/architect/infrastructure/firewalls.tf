resource "digitalocean_firewall" "aosp-emu-firewall" {
    name = "aosp-emu-firewall"
    tags = ["android-emulator"]

    inbound_rule {
        protocol         = "tcp"
        port_range       = "22"
        source_addresses = ["0.0.0.0/0", "::/0"]
    }

    inbound_rule {
        protocol         = "tcp"
        port_range       = "5554"
        source_addresses = ["0.0.0.0/0", "::/0"]
    }

    inbound_rule {
        protocol         = "tcp"
        port_range       = "5555"
        source_addresses = ["0.0.0.0/0", "::/0"]
    }

    inbound_rule {
        protocol         = "tcp"
        port_range       = "8554"
        source_addresses = ["0.0.0.0/0", "::/0"]
    }

    inbound_rule {
        protocol         = "icmp"
        source_addresses = ["0.0.0.0/0", "::/0"]
    }

    outbound_rule {
        protocol              = "tcp"
        port_range            = "1-65535"
        destination_addresses = ["0.0.0.0/0", "::/0"]
    }

    outbound_rule {
        protocol              = "udp"
        port_range            = "1-65535"
        destination_addresses = ["0.0.0.0/0", "::/0"]
    }

    outbound_rule {
        protocol              = "icmp"
        destination_addresses = ["0.0.0.0/0", "::/0"]
    }
}
