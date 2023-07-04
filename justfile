default:
  just --list

up *args="":
  pulumi up {{args}}

